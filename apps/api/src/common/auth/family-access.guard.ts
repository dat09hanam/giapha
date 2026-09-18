import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FamilyStatus, UserRole } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';
import { normalizeFamilySlug } from '../pipes/family-slug.pipe.js';
import type { AuthRequest } from './auth.types.js';
import { FAMILY_ROLES_KEY } from './family-roles.decorator.js';

@Injectable()
export class FamilyAccessGuard implements CanActivate {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.auth)
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    if (request.auth.role === UserRole.ADMIN || !request.auth.familyId) {
      throw new ForbiddenException(
        'Tài khoản quản trị hệ thống không thể truy cập dữ liệu riêng của dòng họ.',
      );
    }

    const rawSlug = (request.params as { slug?: string }).slug;
    const slug = normalizeFamilySlug(rawSlug ?? '');
    const family = await this.prisma.family.findFirst({
      where: { slug, status: FamilyStatus.ACTIVE, deletedAt: null },
      select: { id: true, slug: true },
    });
    if (!family || family.id !== request.auth.familyId) {
      throw new ForbiddenException('Bạn không được phép truy cập dòng họ theo đường dẫn này.');
    }

    const roles = this.reflector.getAllAndOverride<UserRole[]>(FAMILY_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles?.length && !roles.includes(request.auth.role)) {
      throw new ForbiddenException(
        'Vai trò hiện tại không có quyền thực hiện thao tác này trong dòng họ.',
      );
    }

    request.familyAccess = { familyId: family.id, slug: family.slug, role: request.auth.role };
    return true;
  }
}
