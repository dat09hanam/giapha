import { randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';

import { hashSessionToken } from '../common/auth/session-token.js';
import { PrismaService } from '../database/prisma.service.js';
import { findUserByLogin } from './account-lookup.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { GoogleIdentity } from './google-id-token.js';
import { generatePassword, hashPassword, validateOwnPassword, verifyPassword } from './password.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH =
  'scrypt-v1$Z2lhcGhhLWxvZ2luLWR1bW15LXNhbHQ$hvcnNl11-DqwWnFtHhxSgxOIkpINJGzOMLx8Sh224vqeRP3aQ6zRe830XZL59ruchMuByMilGO4tEbDFFzWlFg';

const profileSelect = {
  id: true,
  username: true,
  displayName: true,
  email: true,
  googleSub: true,
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
  email: string | null;
  /** Whether a Google account signs in to this account; the Google id itself stays server-side. */
  googleLinked: boolean;
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
    email: user.email,
    googleLinked: user.googleSub !== null,
    role: user.role,
    family: user.family,
    managesBranches: user._count.branches > 0,
    mustChangePassword: user.mustChangePassword,
  };
}

/**
 * When Google is first linked to an account still on a password someone else issued (admin or
 * clan head), that password is replaced by one nobody knows: the person signs in with Google from
 * now on, is not sent to the change-password page, and can set their own password with
 * "Quên mật khẩu". A password the person chose themselves is kept.
 */
async function retireTemporaryPassword(user: {
  mustChangePassword: boolean;
}): Promise<{ passwordHash?: string; mustChangePassword?: false }> {
  if (!user.mustChangePassword) return {};
  return { passwordHash: await hashPassword(generatePassword()), mustChangePassword: false };
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

    return this.startSession(user.id);
  }

  /**
   * Signs in the account linked to this Google identity. The first time, an account whose email
   * is the verified Google email is linked to it. Null when no account matches.
   */
  async loginWithGoogle(identity: GoogleIdentity): Promise<AuthResult | null> {
    const select = {
      id: true,
      googleSub: true,
      status: true,
      deletedAt: true,
      mustChangePassword: true,
    } as const;
    const user =
      (await this.prisma.user.findUnique({ where: { googleSub: identity.sub }, select })) ??
      (await this.prisma.user.findUnique({ where: { email: identity.email }, select }));
    if (!user) return null;
    if (user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản đã bị khóa hoặc không còn hoạt động.');
    }
    if (user.googleSub && user.googleSub !== identity.sub) {
      throw new UnauthorizedException(
        'Email này đã gắn với một tài khoản Google khác. Hãy đăng nhập bằng mật khẩu.',
      );
    }
    if (!user.googleSub) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { googleSub: identity.sub, ...(await retireTemporaryPassword(user)) },
        select: { id: true },
      });
    }
    return this.startSession(user.id);
  }

  /**
   * Links the signed-in account to a Google account, or moves it to another one. Google proved the
   * person owns it; its verified email becomes the account's email, used for password resets.
   */
  async linkGoogle(userId: string, identity: GoogleIdentity): Promise<AuthProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { isShared: true, mustChangePassword: true },
    });
    if (user.isShared) {
      throw new BadRequestException('Tài khoản dùng chung không được liên kết Google.');
    }
    const [bySub, byEmail] = await Promise.all([
      this.prisma.user.findUnique({ where: { googleSub: identity.sub }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { email: identity.email }, select: { id: true } }),
    ]);
    if ((bySub && bySub.id !== userId) || (byEmail && byEmail.id !== userId)) {
      throw new ConflictException(
        'Tài khoản Google này đã được dùng cho một tài khoản Gia Phả khác.',
      );
    }
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          googleSub: identity.sub,
          email: identity.email,
          ...(await retireTemporaryPassword(user)),
        },
        select: { id: true },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'Tài khoản Google này đã được dùng cho một tài khoản Gia Phả khác.',
        );
      }
      throw error;
    }
    return this.getProfile(userId);
  }

  async startSession(userId: string): Promise<AuthResult> {
    const token = createRawToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prisma.authSession.create({
      data: { userId, tokenHash: hashSessionToken(token), expiresAt },
    });
    return { profile: await this.getProfile(userId), session: { token, expiresAt } };
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
