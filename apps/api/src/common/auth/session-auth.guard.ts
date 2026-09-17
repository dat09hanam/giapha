import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';
import type { AuthRequest } from './auth.types.js';
import { extractSessionToken, hashSessionToken } from './session-token.js';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = extractSessionToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication is required');
    }

    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      select: {
        id: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
            familyId: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (
      !session ||
      session.expiresAt <= new Date() ||
      session.user.deletedAt ||
      session.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException('Session is invalid or expired');
    }

    request.auth = {
      sessionId: session.id,
      userId: session.user.id,
      username: session.user.username,
      displayName: session.user.displayName,
      role: session.user.role,
      familyId: session.user.familyId,
    };

    return true;
  }
}
