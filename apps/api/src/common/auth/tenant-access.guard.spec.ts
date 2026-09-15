import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { MembershipStatus, SystemRole, TenantRole } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../database/prisma.service.js';
import { TenantAccessGuard } from './tenant-access.guard.js';

function httpContext(request: object): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
}

describe('TenantAccessGuard', () => {
  const auth = {
    sessionId: 'session-1',
    userId: 'user-1',
    email: 'head@example.com',
    displayName: 'Trưởng họ',
    systemRole: SystemRole.USER,
  };

  it('authorizes MemberPlus using the server-resolved tenant id', async () => {
    const membershipFindUnique = vi.fn().mockResolvedValue({
      role: TenantRole.MEMBER_PLUS,
      status: MembershipStatus.ACTIVE,
    });
    const prisma = {
      tenant: { findFirst: vi.fn().mockResolvedValue({ id: 'tenant-1', slug: 'nguyen' }) },
      tenantMembership: { findUnique: membershipFindUnique },
    } as unknown as PrismaService;
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([TenantRole.MEMBER_PLUS]),
    } as unknown as Reflector;
    const request = { headers: {}, params: { slug: 'Nguyen' }, auth };
    const guard = new TenantAccessGuard(prisma, reflector);

    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(membershipFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_userId: { tenantId: 'tenant-1', userId: 'user-1' } },
      }),
    );
    expect(request).toHaveProperty('tenantAccess.tenantId', 'tenant-1');
  });

  it('denies Member when a MemberPlus role is required', async () => {
    const prisma = {
      tenant: { findFirst: vi.fn().mockResolvedValue({ id: 'tenant-1', slug: 'nguyen' }) },
      tenantMembership: {
        findUnique: vi.fn().mockResolvedValue({
          role: TenantRole.MEMBER,
          status: MembershipStatus.ACTIVE,
        }),
      },
    } as unknown as PrismaService;
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([TenantRole.MEMBER_PLUS]),
    } as unknown as Reflector;
    const guard = new TenantAccessGuard(prisma, reflector);

    await expect(
      guard.canActivate(httpContext({ headers: {}, params: { slug: 'nguyen' }, auth })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies Admin before looking up any tenant membership', async () => {
    const tenantFindFirst = vi.fn();
    const membershipFindUnique = vi.fn();
    const prisma = {
      tenant: { findFirst: tenantFindFirst },
      tenantMembership: { findUnique: membershipFindUnique },
    } as unknown as PrismaService;
    const reflector = { getAllAndOverride: vi.fn() } as unknown as Reflector;
    const guard = new TenantAccessGuard(prisma, reflector);

    await expect(
      guard.canActivate(
        httpContext({
          headers: {},
          params: { slug: 'nguyen' },
          auth: { ...auth, systemRole: SystemRole.ADMIN },
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tenantFindFirst).not.toHaveBeenCalled();
    expect(membershipFindUnique).not.toHaveBeenCalled();
  });

  it('denies a clan account without membership in the requested tenant', async () => {
    const prisma = {
      tenant: { findFirst: vi.fn().mockResolvedValue({ id: 'tenant-b', slug: 'tran' }) },
      tenantMembership: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([TenantRole.MEMBER_PLUS, TenantRole.MEMBER]),
    } as unknown as Reflector;
    const guard = new TenantAccessGuard(prisma, reflector);

    await expect(
      guard.canActivate(httpContext({ headers: {}, params: { slug: 'tran' }, auth })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.tenantMembership.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_userId: { tenantId: 'tenant-b', userId: 'user-1' } },
      }),
    );
  });
});
