import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import type { AuthRequest } from './auth.types.js';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthRequest>();

    if (request.auth?.role !== UserRole.ADMIN || request.auth.familyId !== null) {
      throw new ForbiddenException('Platform administrator access is required');
    }

    return true;
  }
}
