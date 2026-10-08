import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import type { ConfirmPasswordResetDto, RequestPasswordResetDto } from './dto/password-reset.dto.js';
import { hashPassword, validateOwnPassword } from './password.js';

const CODE_TTL_MS = 10 * 60 * 1000;
/** A new code is not mailed again sooner than this, so the form cannot flood an inbox. */
const RESEND_COOLDOWN_MS = 60 * 1000;
/** Wrong guesses one code survives; six digits leave a guess no real chance within this. */
const MAX_ATTEMPTS = 5;

const INVALID_CODE_MESSAGE = 'Mã xác nhận không đúng hoặc đã hết hạn. Hãy yêu cầu mã mới.';

/** Bound to the account, so a code's digest says nothing outside it. */
function hashCode(userId: string, code: string): string {
  return createHash('sha256').update(`${userId}:${code}`).digest('hex');
}

function digestsMatch(left: string, right: string): boolean {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Quên mật khẩu: a six-digit code mailed to the account's email replaces the password. Requests
 * answer the same whether or not the account exists or has an email, so the form never reveals
 * which usernames are real.
 */
@Injectable()
export class PasswordResetService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  async request(input: RequestPasswordResetDto): Promise<void> {
    // Checked before the lookup, so the answer is the same for every username.
    if (!this.mail.isConfigured) {
      throw new ServiceUnavailableException(
        'Hệ thống chưa được cấu hình gửi email. Vui lòng liên hệ Admin để đặt lại mật khẩu.',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { username: input.username.trim() },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        status: true,
        deletedAt: true,
      },
    });
    if (!user?.email || user.deletedAt || user.status !== UserStatus.ACTIVE) return;

    const latest = await this.prisma.passwordResetCode.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) return;

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const now = new Date();
    const created = await this.prisma.$transaction(async (transaction) => {
      // Only the newest code works.
      await transaction.passwordResetCode.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: now },
      });
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
        subject: 'Mã xác nhận đặt lại mật khẩu Gia Phả',
        text: [
          `Xin chào ${user.displayName},`,
          '',
          `Mã xác nhận để đặt lại mật khẩu cho tài khoản ${user.username} là: ${code}`,
          'Mã có hiệu lực trong 10 phút và chỉ dùng được một lần.',
          '',
          'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này; mật khẩu hiện tại vẫn giữ nguyên.',
        ].join('\n'),
        html: `<p>Xin chào ${escapeHtml(user.displayName)},</p>
<p>Mã xác nhận để đặt lại mật khẩu cho tài khoản <strong>${escapeHtml(user.username)}</strong> là:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
<p>Mã có hiệu lực trong 10 phút và chỉ dùng được một lần.</p>
<p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này; mật khẩu hiện tại vẫn giữ nguyên.</p>`,
      });
    } catch {
      // The code never reached anyone; drop it so the cooldown does not block a retry.
      await this.prisma.passwordResetCode.delete({ where: { id: created.id } });
      throw new ServiceUnavailableException('Không gửi được email lúc này. Vui lòng thử lại sau.');
    }
  }

  /** Replaces the password and signs the account out everywhere. */
  async confirm(input: ConfirmPasswordResetDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { username: input.username.trim() },
      select: { id: true, status: true, deletedAt: true },
    });
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

    const password = validateOwnPassword(input.newPassword);
    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction(async (transaction) => {
      // Claimed first: a second request racing with the same code finds it used.
      const claimed = await transaction.passwordResetCode.updateMany({
        where: { id: pending.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (claimed.count === 0) throw new BadRequestException(INVALID_CODE_MESSAGE);
      await transaction.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false },
      });
      await transaction.authSession.deleteMany({ where: { userId: user.id } });
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
