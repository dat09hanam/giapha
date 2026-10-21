import {
  Controller,
  Get,
  Header,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AllowExpiredFamily } from '../common/auth/allow-expired-family.decorator.js';
import type { AuthRequest } from '../common/auth/auth.types.js';
import { FamilyAccessGuard } from '../common/auth/family-access.guard.js';
import { FamilyRoles } from '../common/auth/family-roles.decorator.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import { FamilySlugPipe } from '../common/pipes/family-slug.pipe.js';
import { PlanPaymentService, type PlanRenewal } from './plan-payment.service.js';

/** The clan head renews the family plan by bank transfer; open while the plan has run out. */
@Controller('families/:slug/plan/renewals')
@UseGuards(SessionAuthGuard, FamilyAccessGuard)
@FamilyRoles(UserRole.MEMBER_PLUS)
@AllowExpiredFamily()
export class PlanPaymentController {
  constructor(@Inject(PlanPaymentService) private readonly payments: PlanPaymentService) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  create(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Req() request: AuthRequest,
  ): Promise<PlanRenewal> {
    return this.payments.createRenewal(familyIdOf(request));
  }

  @Get(':paymentId')
  @Header('Cache-Control', 'no-store')
  get(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Req() request: AuthRequest,
  ): Promise<PlanRenewal> {
    return this.payments.getRenewal(familyIdOf(request), paymentId);
  }
}

function familyIdOf(request: AuthRequest): string {
  if (!request.familyAccess)
    throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
  return request.familyAccess.familyId;
}
