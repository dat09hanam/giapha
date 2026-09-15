import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { SystemRole, UserStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../database/prisma.service.js';
import { hashSessionToken } from './session-token.js';
import { SessionAuthGuard } from './session-auth.guard.js';

function httpContext(request: object): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('SessionAuthGuard', () => {
  it('loads the current user from a hashed bearer token', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'session-1',
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'user-1',
        email: 'head@example.com',
        displayName: 'Trưởng họ',
        systemRole: SystemRole.USER,
        status: UserStatus.ACTIVE,
      },
    });
    const prisma = { authSession: { findUnique } } as unknown as PrismaService;
    const guard = new SessionAuthGuard(prisma);
    const request = { headers: { authorization: 'Bearer secret-token' } };

    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashSessionToken('secret-token') } }),
    );
    expect(request).toHaveProperty('auth.userId', 'user-1');
  });

  it('rejects expired sessions', async () => {
    const prisma = {
      authSession: {
        findUnique: vi.fn().mockResolvedValue({
          expiresAt: new Date(Date.now() - 1),
          user: { status: UserStatus.ACTIVE },
        }),
      },
    } as unknown as PrismaService;
    const guard = new SessionAuthGuard(prisma);

    await expect(
      guard.canActivate(httpContext({ headers: { cookie: 'giapha_session=expired' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
