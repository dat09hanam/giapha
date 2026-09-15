import { BadRequestException, ConflictException } from '@nestjs/common';
import { FamilyStatus, UserRole, UserStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../database/prisma.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService roles and invitations', () => {
  it('registers a MemberPlus attached to the new Family', async () => {
    const familyCreate = vi.fn().mockResolvedValue({ id: 'family-1' });
    const userCreate = vi.fn().mockResolvedValue({ id: 'user-1' });
    const transaction = {
      family: { create: familyCreate },
      user: {
        create: userCreate,
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: 'user-1', email: 'head@example.com', displayName: 'Trưởng họ',
          role: UserRole.MEMBER_PLUS,
          family: { id: 'family-1', slug: 'nguyen', name: 'Họ Nguyễn' },
        }),
      },
      authSession: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction)),
    } as unknown as PrismaService;

    const result = await new AuthService(prisma).registerClanHead({
      email: 'HEAD@example.com', password: 'strong-password-2026',
      displayName: 'Trưởng họ', clanName: 'Họ Nguyễn', slug: 'nguyen',
    });

    expect(familyCreate).toHaveBeenCalledWith({ data: { slug: 'nguyen', name: 'Họ Nguyễn' } });
    expect(userCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'head@example.com', role: UserRole.MEMBER_PLUS, familyId: 'family-1',
      }),
    }));
    expect(result.profile.role).toBe(UserRole.MEMBER_PLUS);
    expect(result.profile.family?.id).toBe('family-1');
  });

  it('returns Admin without a Family', async () => {
    const prisma = { user: { findFirst: vi.fn().mockResolvedValue({
      id: 'admin-1', email: 'admin@example.com', displayName: 'Admin',
      role: UserRole.ADMIN, family: null,
    }) } } as unknown as PrismaService;
    const profile = await new AuthService(prisma).getProfile('admin-1');
    expect(profile.role).toBe(UserRole.ADMIN);
    expect(profile.family).toBeNull();
  });

  it('consumes an invitation into an active Member account exactly once', async () => {
    const invitationToken = 'invitation-token-with-more-than-32-characters';
    const claim = vi.fn().mockResolvedValue({ count: 1 });
    const transaction = {
      user: {
        updateMany: claim,
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: 'member-1', email: 'member@example.com', displayName: 'Thành viên',
          role: UserRole.MEMBER,
          family: { id: 'family-1', slug: 'nguyen', name: 'Họ Nguyễn' },
        }),
      },
      authSession: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({
        id: 'member-1', email: 'member@example.com', role: UserRole.MEMBER,
        status: UserStatus.INVITED, invitationExpiresAt: new Date(Date.now() + 60_000),
        family: { status: FamilyStatus.ACTIVE },
      }) },
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction)),
    } as unknown as PrismaService;
    const result = await new AuthService(prisma).acceptInvitation({
      invitationToken, email: 'MEMBER@example.com',
      password: 'strong-password-2026', displayName: 'Thành viên',
    });
    expect(claim).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ role: UserRole.MEMBER, status: UserStatus.INVITED }),
      data: expect.objectContaining({ status: UserStatus.ACTIVE, invitationTokenHash: null }),
    }));
    expect(result.profile.role).toBe(UserRole.MEMBER);
  });

  it('rejects expired invitations before changing the database', async () => {
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({
        id: 'member-1', email: 'member@example.com', role: UserRole.MEMBER,
        status: UserStatus.INVITED, invitationExpiresAt: new Date(Date.now() - 1),
        family: { status: FamilyStatus.ACTIVE },
      }) },
      $transaction: vi.fn(),
    } as unknown as PrismaService;
    await expect(new AuthService(prisma).acceptInvitation({
      invitationToken: 'invitation-token-with-more-than-32-characters',
      email: 'member@example.com', password: 'strong-password-2026', displayName: 'Thành viên',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not invite an existing account from another Family', async () => {
    const prisma = {
      family: { findFirst: vi.fn().mockResolvedValue({ id: 'family-1' }) },
      user: { findUnique: vi.fn().mockResolvedValue({
        id: 'member-2', role: UserRole.MEMBER, familyId: 'family-2', status: UserStatus.ACTIVE,
      }), create: vi.fn() },
    } as unknown as PrismaService;
    await expect(new AuthService(prisma).createInvitation('family-1', {
      email: 'member@example.com', expiresInDays: 7,
    })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
