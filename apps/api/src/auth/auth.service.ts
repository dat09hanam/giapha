import { randomBytes } from 'node:crypto';

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserStatus, type Prisma } from '@prisma/client';

import { hashSessionToken } from '../common/auth/session-token.js';
import { PrismaService } from '../database/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import { verifyPassword } from './password.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH =
  'scrypt-v1$Z2lhcGhhLWxvZ2luLWR1bW15LXNhbHQ$hvcnNl11-DqwWnFtHhxSgxOIkpINJGzOMLx8Sh224vqeRP3aQ6zRe830XZL59ruchMuByMilGO4tEbDFFzWlFg';

const profileSelect = {
  id: true,
  username: true,
  displayName: true,
  role: true,
  family: { select: { id: true, slug: true, name: true } },
} satisfies Prisma.UserSelect;

type ProfileRecord = Prisma.UserGetPayload<{ select: typeof profileSelect }>;

export type AuthProfile = {
  id: string;
  username: string;
  displayName: string;
  role: ProfileRecord['role'];
  family: { id: string; slug: string; name: string } | null;
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
  };
}

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async login(input: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { username: input.username.trim() },
      select: { id: true, passwordHash: true, status: true },
    });
    const passwordMatches = await verifyPassword(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || user.status !== UserStatus.ACTIVE || !passwordMatches) {
      throw new UnauthorizedException('Username or password is incorrect');
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

  async getProfile(userId: string): Promise<AuthProfile> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, status: UserStatus.ACTIVE },
      select: profileSelect,
    });
    if (!user) throw new UnauthorizedException('Account is not active');
    return mapProfile(user);
  }
}
