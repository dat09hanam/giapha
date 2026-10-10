import { randomBytes } from 'node:crypto';

import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserStatus, type Prisma } from '@prisma/client';

import { hashSessionToken } from '../common/auth/session-token.js';
import { PrismaService } from '../database/prisma.service.js';
import { findUserByLogin } from './account-lookup.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { hashPassword, validateOwnPassword, verifyPassword } from './password.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH =
  'scrypt-v1$Z2lhcGhhLWxvZ2luLWR1bW15LXNhbHQ$hvcnNl11-DqwWnFtHhxSgxOIkpINJGzOMLx8Sh224vqeRP3aQ6zRe830XZL59ruchMuByMilGO4tEbDFFzWlFg';

const profileSelect = {
  id: true,
  username: true,
  displayName: true,
  role: true,
  mustChangePassword: true,
  family: { select: { id: true, slug: true, name: true } },
  _count: { select: { branches: true } },
} satisfies Prisma.UserSelect;

type ProfileRecord = Prisma.UserGetPayload<{ select: typeof profileSelect }>;

export type AuthProfile = {
  id: string;
  username: string;
  displayName: string;
  role: ProfileRecord['role'];
  family: { id: string; slug: string; name: string } | null;
  managesBranches: boolean;
  mustChangePassword: boolean;
};

export type AuthResult = {
  profile: AuthProfile;
  session: { token: string; expiresAt: Date };
};

function createRawToken(): string {
  return randomBytes(32).toString('base64url');
}

function mapProfile(user: ProfileRecord): AuthProfile {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    family: user.family,
    managesBranches: user._count.branches > 0,
    mustChangePassword: user.mustChangePassword,
  };
}

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async login(input: LoginDto): Promise<AuthResult> {
    const user = await findUserByLogin(this.prisma, input.username, {
      id: true,
      passwordHash: true,
      status: true,
      deletedAt: true,
    });
    const passwordMatches = await verifyPassword(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE || !passwordMatches) {
      throw new UnauthorizedException('Tên đăng nhập, email hoặc mật khẩu không đúng.');
    }

    const token = createRawToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prisma.authSession.create({
      data: { userId: user.id, tokenHash: hashSessionToken(token), expiresAt },
    });
    return { profile: await this.getProfile(user.id), session: { token, expiresAt } };
  }

  async logout(rawToken: string | null): Promise<void> {
    if (!rawToken) return;
    await this.prisma.authSession.deleteMany({
      where: { tokenHash: hashSessionToken(rawToken) },
    });
  }

  async changePassword(
    userId: string,
    sessionId: string,
    input: ChangePasswordDto,
  ): Promise<AuthProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng.');
    }
    const password = validateOwnPassword(input.newPassword);
    if (password === input.currentPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại.');
    }

    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePassword: false },
      }),
      this.prisma.authSession.deleteMany({ where: { userId, id: { not: sessionId } } }),
    ]);
    return this.getProfile(userId);
  }

  async getProfile(userId: string): Promise<AuthProfile> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, status: UserStatus.ACTIVE, deletedAt: null },
      select: profileSelect,
    });
    if (!user) throw new UnauthorizedException('Tài khoản đã bị khóa hoặc không còn hoạt động.');
    return mapProfile(user);
  }
}
