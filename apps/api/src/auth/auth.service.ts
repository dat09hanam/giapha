import { randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FamilyStatus, Prisma, UserRole, UserStatus } from '@prisma/client';

import { hashSessionToken } from '../common/auth/session-token.js';
import { normalizeFamilySlug } from '../common/pipes/family-slug.pipe.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import type { CreateInvitationDto } from './dto/create-invitation.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterClanHeadDto } from './dto/register-clan-head.dto.js';
import { hashPassword, verifyPassword } from './password.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH =
  'scrypt-v1$Z2lhcGhhLWxvZ2luLWR1bW15LXNhbHQ$hvcnNl11-DqwWnFtHhxSgxOIkpINJGzOMLx8Sh224vqeRP3aQ6zRe830XZL59ruchMuByMilGO4tEbDFFzWlFg';

const profileSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  family: { select: { id: true, slug: true, name: true } },
} satisfies Prisma.UserSelect;

type ProfileRecord = Prisma.UserGetPayload<{ select: typeof profileSelect }>;

export type AuthProfile = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  family: { id: string; slug: string; name: string } | null;
};

export type AuthResult = {
  profile: AuthProfile;
  session: { token: string; expiresAt: Date };
};

export type InvitationResult = {
  email: string;
  invitationToken: string;
  expiresAt: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createRawToken(): string {
  return randomBytes(32).toString('base64url');
}

function mapProfile(user: ProfileRecord): AuthProfile {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    family: user.family,
  };
}

function mapConflict(error: unknown, message: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException(message);
  }
  throw error;
}

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async registerClanHead(input: RegisterClanHeadDto): Promise<AuthResult> {
    const email = normalizeEmail(input.email);
    const slug = normalizeFamilySlug(input.slug);
    const passwordHash = await hashPassword(input.password);
    const token = createRawToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    try {
      const user = await this.prisma.$transaction(async (transaction) => {
        const family = await transaction.family.create({
          data: { slug, name: input.clanName.trim() },
        });
        const createdUser = await transaction.user.create({
          data: {
            email,
            passwordHash,
            displayName: input.displayName.trim(),
            role: UserRole.MEMBER_PLUS,
            familyId: family.id,
          },
        });
        await transaction.authSession.create({
          data: { userId: createdUser.id, tokenHash: hashSessionToken(token), expiresAt },
        });
        return transaction.user.findUniqueOrThrow({
          where: { id: createdUser.id },
          select: profileSelect,
        });
      });

      return { profile: mapProfile(user), session: { token, expiresAt } };
    } catch (error: unknown) {
      mapConflict(error, 'Email or family address is already registered');
    }
  }

  async acceptInvitation(input: AcceptInvitationDto): Promise<AuthResult> {
    const email = normalizeEmail(input.email);
    const tokenHash = hashSessionToken(input.invitationToken);
    const now = new Date();
    const invitedUser = await this.prisma.user.findUnique({
      where: { invitationTokenHash: tokenHash },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        invitationExpiresAt: true,
        family: { select: { status: true } },
      },
    });
    if (
      !invitedUser ||
      invitedUser.email !== email ||
      invitedUser.role !== UserRole.MEMBER ||
      invitedUser.status !== UserStatus.INVITED ||
      !invitedUser.invitationExpiresAt ||
      invitedUser.invitationExpiresAt <= now ||
      invitedUser.family?.status !== FamilyStatus.ACTIVE
    ) {
      throw new BadRequestException('Invitation is invalid or expired');
    }

    const passwordHash = await hashPassword(input.password);
    const sessionToken = createRawToken();
    const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const user = await this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.user.updateMany({
        where: {
          id: invitedUser.id,
          email,
          invitationTokenHash: tokenHash,
          invitationExpiresAt: { gt: now },
          role: UserRole.MEMBER,
          status: UserStatus.INVITED,
          family: { status: FamilyStatus.ACTIVE },
        },
        data: {
          passwordHash,
          displayName: input.displayName.trim(),
          status: UserStatus.ACTIVE,
          invitationTokenHash: null,
          invitationExpiresAt: null,
        },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('Invitation has already been used');
      }
      await transaction.authSession.create({
        data: {
          userId: invitedUser.id,
          tokenHash: hashSessionToken(sessionToken),
          expiresAt: sessionExpiresAt,
        },
      });
      return transaction.user.findUniqueOrThrow({
        where: { id: invitedUser.id },
        select: profileSelect,
      });
    });

    return {
      profile: mapProfile(user),
      session: { token: sessionToken, expiresAt: sessionExpiresAt },
    };
  }

  async login(input: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(input.email) },
      select: { id: true, passwordHash: true, status: true },
    });
    const passwordMatches = await verifyPassword(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || user.status !== UserStatus.ACTIVE || !passwordMatches) {
      throw new UnauthorizedException('Email or password is incorrect');
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

  async createInvitation(familyId: string, input: CreateInvitationDto): Promise<InvitationResult> {
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, status: FamilyStatus.ACTIVE },
      select: { id: true },
    });
    if (!family) throw new BadRequestException('Family is not active');

    const email = normalizeEmail(input.email);
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, familyId: true, status: true },
    });
    if (
      existing &&
      (existing.role !== UserRole.MEMBER ||
        existing.familyId !== familyId ||
        existing.status !== UserStatus.INVITED)
    ) {
      throw new ConflictException('This email already has an account');
    }

    const invitationToken = createRawToken();
    const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
    const tokenHash = hashSessionToken(invitationToken);
    try {
      if (existing) {
        const updated = await this.prisma.user.updateMany({
          where: { id: existing.id, status: UserStatus.INVITED, familyId },
          data: { invitationTokenHash: tokenHash, invitationExpiresAt: expiresAt },
        });
        if (updated.count !== 1) throw new ConflictException('Invitation is no longer available');
      } else {
        await this.prisma.user.create({
          data: {
            email,
            displayName: 'Thành viên được mời',
            role: UserRole.MEMBER,
            familyId,
            status: UserStatus.INVITED,
            invitationTokenHash: tokenHash,
            invitationExpiresAt: expiresAt,
          },
        });
      }
    } catch (error: unknown) {
      mapConflict(error, 'This email already has an account');
    }

    return { email, invitationToken, expiresAt: expiresAt.toISOString() };
  }
}
