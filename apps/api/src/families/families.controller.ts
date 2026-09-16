import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import type { AuthRequest } from '../common/auth/auth.types.js';
import { FamilyAccessGuard } from '../common/auth/family-access.guard.js';
import { FamilyRoles } from '../common/auth/family-roles.decorator.js';
import { PlatformAdminGuard } from '../common/auth/platform-admin.guard.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import { FamilySlugPipe } from '../common/pipes/family-slug.pipe.js';
// Runtime import is required for Nest's emitted DTO validation metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateFamilyDto } from './dto/create-family.dto.js';
// Runtime import is required for Nest's emitted DTO validation metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateFamilyDto } from './dto/update-family.dto.js';
import {
  FamiliesService,
  type CreatedFamilyResult,
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

  @Get(':slug')
  getFamily(@Param('slug', FamilySlugPipe) slug: string): Promise<FamilySummary> {
    return this.families.getPublicFamily(slug);
  }

  @Patch(':slug')
  @UseGuards(SessionAuthGuard, FamilyAccessGuard)
  @FamilyRoles(UserRole.MEMBER_PLUS)
  updateFamily(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Body() input: UpdateFamilyDto,
    @Req() request: AuthRequest,
  ): Promise<FamilySummary> {
    if (!request.familyAccess) throw new UnauthorizedException('Authentication is required');
    return this.families.updateFamily(request.familyAccess.familyId, input);
  }
}
