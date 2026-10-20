import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import type { AuthRequest } from '../common/auth/auth.types.js';
import { FamilyAccessGuard } from '../common/auth/family-access.guard.js';
import { FamilyRoles } from '../common/auth/family-roles.decorator.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import { FamilySlugPipe } from '../common/pipes/family-slug.pipe.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RequestPlanChangeDto } from './family-plan.dto.js';
import {
  FamilyPlanService,
  type FamilyPlanOverview,
  type PlanChangeRequest,
} from './family-plan.service.js';

/** The clan head's own view of the family plan; changing it stays with the platform admin. */
@Controller('families/:slug/plan')
@UseGuards(SessionAuthGuard, FamilyAccessGuard)
@FamilyRoles(UserRole.MEMBER_PLUS)
export class FamilyPlanController {
  constructor(@Inject(FamilyPlanService) private readonly familyPlan: FamilyPlanService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  overview(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Req() request: AuthRequest,
  ): Promise<FamilyPlanOverview> {
    return this.familyPlan.getOverview(familyIdOf(request));
  }

  @Post('requests')
  requestChange(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Body() input: RequestPlanChangeDto,
    @Req() request: AuthRequest,
  ): Promise<PlanChangeRequest> {
    return this.familyPlan.requestChange(familyIdOf(request), input);
  }
}

function familyIdOf(request: AuthRequest): string {
  if (!request.familyAccess)
    throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
  return request.familyAccess.familyId;
}
