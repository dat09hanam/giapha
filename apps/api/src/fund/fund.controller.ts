import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
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
import { RequiresFamilyFeature } from '../common/auth/family-feature.decorator.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import { FamilySlugPipe } from '../common/pipes/family-slug.pipe.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SaveFundEntryDto } from './fund.dto.js';
import { FundService, type FundEntryResponse, type FundResponse } from './fund.service.js';

@Controller('families/:slug/fund')
@RequiresFamilyFeature('fund')
@UseGuards(SessionAuthGuard, FamilyAccessGuard)
@FamilyRoles(UserRole.MEMBER_PLUS)
export class FundController {
  constructor(@Inject(FundService) private readonly fund: FundService) {}

  @Get()
  @FamilyRoles(UserRole.MEMBER_PLUS, UserRole.MEMBER)
  getLedger(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Req() request: AuthRequest,
  ): Promise<FundResponse> {
    return this.fund.getLedger(
      this.familyId(request),
      request.familyAccess?.role === UserRole.MEMBER_PLUS,
    );
  }

  @Post('entries')
  create(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Body() input: SaveFundEntryDto,
    @Req() request: AuthRequest,
  ): Promise<FundEntryResponse> {
    return this.fund.create(this.familyId(request), input);
  }

  @Patch('entries/:entryId')
  update(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string,
    @Body() input: SaveFundEntryDto,
    @Req() request: AuthRequest,
  ): Promise<FundEntryResponse> {
    return this.fund.update(this.familyId(request), entryId, input);
  }

  @Delete('entries/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string,
    @Req() request: AuthRequest,
  ): Promise<void> {
    return this.fund.remove(this.familyId(request), entryId);
  }

  private familyId(request: AuthRequest): string {
    if (!request.familyAccess) {
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    }
    return request.familyAccess.familyId;
  }
}
