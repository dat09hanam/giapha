import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';
import type { AuthRequest } from './auth.types.js';
import { ALLOW_PENDING_PASSWORD_CHANGE_KEY } from './password-change.decorator.js';
import { extractSessionToken, hashSessionToken } from './session-token.js';

export const PASSWORD_CHANGE_REQUIRED_MESSAGE =
  'Bạn cần đổi mật khẩu được cấp trước khi tiếp tục sử dụng.';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = extractSessionToken(request);

    if (!token) {
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
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
            mustChangePassword: true,
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
      throw new UnauthorizedException(
        'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
      );
    }

    if (
      session.user.mustChangePassword &&
      !this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_PASSWORD_CHANGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      throw new ForbiddenException(PASSWORD_CHANGE_REQUIRED_MESSAGE);
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
