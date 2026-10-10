import {
  ForbiddenException,
  Inject,
  NotFoundException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FamilyStatus, UserRole } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';
import { isFamilyFeatureOn, type FamilyFeature } from '../family-features.js';
import { FAMILY_EXPIRED_MESSAGE, isFamilyExpired } from '../family-plan.js';
import { normalizeFamilySlug } from '../pipes/family-slug.pipe.js';
import type { AuthRequest } from './auth.types.js';
import { FAMILY_FEATURE_KEY } from './family-feature.decorator.js';
import { FAMILY_ROLES_KEY } from './family-roles.decorator.js';

const ADMIN_REFUSED_MESSAGE =
  'Tài khoản quản trị hệ thống không thể truy cập dữ liệu riêng của dòng họ.';

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
    const platformAdmin = request.auth.role === UserRole.ADMIN && !request.auth.familyId;
    if (!platformAdmin && (request.auth.role === UserRole.ADMIN || !request.auth.familyId)) {
      throw new ForbiddenException(ADMIN_REFUSED_MESSAGE);
    }

    const rawSlug = (request.params as { slug?: string }).slug;
    const slug = normalizeFamilySlug(rawSlug ?? '');
    const family = await this.prisma.family.findFirst({
      where: { slug, status: { in: [FamilyStatus.ACTIVE, FamilyStatus.EXPIRED] }, deletedAt: null },
      select: { id: true, slug: true, isDemo: true, status: true, planExpiresAt: true },
    });
    if (platformAdmin) {
      if (!family?.isDemo) throw new ForbiddenException(ADMIN_REFUSED_MESSAGE);
    } else if (!family || family.id !== request.auth.familyId) {
      throw new ForbiddenException('Bạn không được phép truy cập dòng họ theo đường dẫn này.');
    }
    if (isFamilyExpired(family)) throw new ForbiddenException(FAMILY_EXPIRED_MESSAGE);
    const role = platformAdmin ? UserRole.MEMBER_PLUS : request.auth.role;

    const roles = this.reflector.getAllAndOverride<UserRole[]>(FAMILY_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles?.length && !roles.includes(role)) {
      throw new ForbiddenException(
        'Vai trò hiện tại không có quyền thực hiện thao tác này trong dòng họ.',
      );
    }

    const feature = this.reflector.getAllAndOverride<FamilyFeature | undefined>(
      FAMILY_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (feature && !(await isFamilyFeatureOn(this.prisma, family.id, feature))) {
      throw new NotFoundException('Chức năng này chưa được bật cho dòng họ.');
    }

    request.familyAccess = {
      familyId: family.id,
      userId: request.auth.userId,
      slug: family.slug,
      role,
    };
    return true;
  }
}
