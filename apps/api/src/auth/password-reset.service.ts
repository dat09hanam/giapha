import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';

import { SITE_BRAND } from '../common/site-brand.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { findUserByLogin } from './account-lookup.js';
import type {
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
  VerifyPasswordResetDto,
} from './dto/password-reset.dto.js';
import { hashPassword, validateOwnPassword } from './password.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const INVALID_CODE_MESSAGE = 'Mã xác nhận không đúng hoặc đã hết hạn. Hãy yêu cầu mã mới.';

function hashCode(userId: string, code: string): string {
  return createHash('sha256').update(`${userId}:${code}`).digest('hex');
}

function digestsMatch(left: string, right: string): boolean {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export type PasswordResetRequested = { sentTo: string };

@Injectable()
export class PasswordResetService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  async request(input: RequestPasswordResetDto): Promise<PasswordResetRequested> {
    if (!this.mail.isConfigured) {
      throw new ServiceUnavailableException(
        'Hệ thống chưa được cấu hình gửi email. Vui lòng liên hệ Admin để đặt lại mật khẩu.',
      );
    }
    const user = await this.findAccount(input.login);
    if (!user || user.deletedAt) {
      throw new NotFoundException('Tài khoản không tồn tại.');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Tài khoản đang bị khóa. Vui lòng liên hệ Admin.');
    }
    if (!user.email) {
      throw new BadRequestException(
        'Tài khoản chưa đăng ký email. Vui lòng liên hệ Admin để đặt lại mật khẩu.',
      );
    }
    const answer = { sentTo: maskEmail(user.email) };

    const latest = await this.prisma.passwordResetCode.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) return answer;

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const now = new Date();
    const created = await this.prisma.$transaction(async (transaction) => {
      await transaction.passwordResetCode.deleteMany({ where: { userId: user.id } });
      return transaction.passwordResetCode.create({
        data: {
          userId: user.id,
          codeHash: hashCode(user.id, code),
          expiresAt: new Date(now.getTime() + CODE_TTL_MS),
        },
        select: { id: true },
      });
    });

    try {
      await this.mail.send({
        to: user.email,
        subject: `Mã xác nhận đặt lại mật khẩu ${SITE_BRAND.name}`,
        text: [
          `Xin chào ${user.displayName},`,
          '',
          'Mã xác nhận đặt lại mật khẩu của bạn là:',
          '',
          code,
          '',
          'Mã có hiệu lực trong 10 phút và chỉ sử dụng được một lần. Xin đừng chia sẻ mã này với người khác để bảo vệ tài khoản.',
          '',
          `${SITE_BRAND.name} đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản ${user.username}. Vui lòng nhập mã trên để tạo mật khẩu mới và tiếp tục kết nối cùng gia đình, dòng họ.`,
          '',
          'Nếu bạn không yêu cầu đặt lại mật khẩu, xin bỏ qua email này. Mật khẩu hiện tại vẫn được giữ nguyên.',
          '',
          'Thân mến,',
          SITE_BRAND.name,
          SITE_BRAND.tagline,
        ].join('\n'),
        html: `<p>Xin chào ${escapeHtml(user.displayName)},</p>
<p>Mã xác nhận đặt lại mật khẩu của bạn là:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
<p>Mã có hiệu lực trong 10 phút và chỉ sử dụng được một lần. Xin đừng chia sẻ mã này với người khác để bảo vệ tài khoản.</p>
<p>${SITE_BRAND.name} đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>${escapeHtml(user.username)}</strong>. Vui lòng nhập mã trên để tạo mật khẩu mới và tiếp tục kết nối cùng gia đình, dòng họ.</p>
<p>Nếu bạn không yêu cầu đặt lại mật khẩu, xin bỏ qua email này. Mật khẩu hiện tại vẫn được giữ nguyên.</p>
<p>Thân mến,<br><strong>${SITE_BRAND.name}</strong><br><em>${SITE_BRAND.tagline}</em></p>`,
      });
    } catch {
      await this.prisma.passwordResetCode.delete({ where: { id: created.id } });
      throw new ServiceUnavailableException('Không gửi được email lúc này. Vui lòng thử lại sau.');
    }
    return answer;
  }

  async verify(input: VerifyPasswordResetDto): Promise<void> {
    await this.checkCode(input);
  }

  async confirm(input: ConfirmPasswordResetDto): Promise<void> {
    const { user, pending } = await this.checkCode(input);
    const password = validateOwnPassword(input.newPassword);
    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.passwordResetCode.deleteMany({ where: { id: pending.id } });
      if (claimed.count === 0) throw new BadRequestException(INVALID_CODE_MESSAGE);
      await transaction.passwordResetCode.deleteMany({ where: { userId: user.id } });
      await transaction.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false },
      });
      await transaction.authSession.deleteMany({ where: { userId: user.id } });
    });
  }

  private async checkCode(input: VerifyPasswordResetDto) {
    const user = await this.findAccount(input.login);
    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }
    const pending = await this.prisma.passwordResetCode.findFirst({
      where: { userId: user.id, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, codeHash: true, attempts: true },
    });
    if (!pending || pending.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }
    if (!digestsMatch(pending.codeHash, hashCode(user.id, input.code))) {
      const attempts = pending.attempts + 1;
      await this.prisma.passwordResetCode.update({
        where: { id: pending.id },
        data: { attempts },
      });
      const left = MAX_ATTEMPTS - attempts;
      throw new BadRequestException(
        left > 0
          ? `Mã xác nhận không đúng. Bạn còn ${left} lần thử.`
          : 'Mã xác nhận không đúng và đã bị khóa. Hãy yêu cầu mã mới.',
      );
    }
    return { user, pending };
  }

  private findAccount(login: string) {
    return findUserByLogin(this.prisma, login, {
      id: true,
      username: true,
      displayName: true,
      email: true,
      status: true,
      deletedAt: true,
    });
  }
}

function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  const local = email.slice(0, at);
  const shown = local.slice(0, Math.max(1, Math.min(6, local.length - 1)));
  return `${shown}***${email.slice(at)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
