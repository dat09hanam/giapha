import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import type { AuthRequest } from '../common/auth/auth.types.js';
import type { FamilyFeatures } from '../common/family-features.js';
import { FamilyAccessGuard } from '../common/auth/family-access.guard.js';
import { FamilyRoles } from '../common/auth/family-roles.decorator.js';
import { PlatformAdminGuard } from '../common/auth/platform-admin.guard.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import { FamilySlugPipe } from '../common/pipes/family-slug.pipe.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateFamilyDto } from './dto/create-family.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ChangeFamilyPlanDto } from './dto/change-family-plan.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { FamilySlugCheckQueryDto } from './dto/family-slug-check.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateFamilyDto } from './dto/update-family.dto.js';
import {
  FamiliesService,
  type AdminFamilyListItem,
  type CreatedFamilyResult,
  type FamilyPlanLimits,
  type FamilySlugCheck,
  type FamilySummary,
} from './families.service.js';

@Controller('families')
export class FamiliesController {
  constructor(@Inject(FamiliesService) private readonly families: FamiliesService) {}

  @Post()
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @Header('Cache-Control', 'no-store')
  createFamily(@Body() input: CreateFamilyDto): Promise<CreatedFamilyResult> {
    return this.families.createFamily(input);
  }

  @Get()
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @Header('Cache-Control', 'no-store')
  listFamilies(): Promise<AdminFamilyListItem[]> {
    return this.families.listFamilies();
  }

  @Get('slug-check')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @Header('Cache-Control', 'no-store')
  checkFamilySlug(@Query() query: FamilySlugCheckQueryDto): Promise<FamilySlugCheck> {
    return this.families.checkFamilySlug(query);
  }

  @Get(':slug')
  getFamily(@Param('slug', FamilySlugPipe) slug: string): Promise<FamilySummary> {
    return this.families.getPublicFamily(slug);
  }

  @Get(':slug/plan-limits')
  @UseGuards(SessionAuthGuard, FamilyAccessGuard)
  @Header('Cache-Control', 'no-store')
  getPlanLimits(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Req() request: AuthRequest,
  ): Promise<FamilyPlanLimits> {
    if (!request.familyAccess)
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    return this.families.getPlanLimits(request.familyAccess.familyId);
  }

  @Get(':slug/features')
  @Header('Cache-Control', 'no-store')
  getFamilyFeatures(@Param('slug', FamilySlugPipe) slug: string): Promise<FamilyFeatures> {
    return this.families.getFamilyFeatures(slug);
  }

  @Patch(':slug/plan')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @Header('Cache-Control', 'no-store')
  changePlan(
    @Param('slug', FamilySlugPipe) slug: string,
    @Body() input: ChangeFamilyPlanDto,
  ): Promise<AdminFamilyListItem> {
    return this.families.changePlan(slug, input);
  }

  @Post(':slug/plan/renew')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @Header('Cache-Control', 'no-store')
  renewPlan(@Param('slug', FamilySlugPipe) slug: string): Promise<AdminFamilyListItem> {
    return this.families.renewPlan(slug);
  }

  @Patch(':slug')
  @UseGuards(SessionAuthGuard, FamilyAccessGuard)
  @FamilyRoles(UserRole.MEMBER_PLUS)
  updateFamily(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Body() input: UpdateFamilyDto,
    @Req() request: AuthRequest,
  ): Promise<FamilySummary> {
    if (!request.familyAccess)
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    return this.families.updateFamily(request.familyAccess.familyId, input);
  }
}
