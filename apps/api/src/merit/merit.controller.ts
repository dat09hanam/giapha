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
import { SaveMeritDonationDto, SaveMeritEventDto } from './merit.dto.js';
import {
  MeritService,
  type MeritDonationResponse,
  type MeritEventDetailResponse,
  type MeritEventResponse,
  type MeritOverviewResponse,
} from './merit.service.js';

@Controller('families/:slug/merit')
@RequiresFamilyFeature('merit')
@UseGuards(SessionAuthGuard, FamilyAccessGuard)
@FamilyRoles(UserRole.MEMBER_PLUS)
export class MeritController {
  constructor(@Inject(MeritService) private readonly merit: MeritService) {}

  @Get()
  @FamilyRoles(UserRole.MEMBER_PLUS, UserRole.MEMBER)
  getOverview(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Req() request: AuthRequest,
  ): Promise<MeritOverviewResponse> {
    return this.merit.getOverview(this.familyId(request), this.canManage(request));
  }

  @Get('events/:eventId')
  @FamilyRoles(UserRole.MEMBER_PLUS, UserRole.MEMBER)
  getEvent(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Req() request: AuthRequest,
  ): Promise<MeritEventDetailResponse> {
    return this.merit.getEvent(this.familyId(request), eventId, this.canManage(request));
  }

  @Post('events')
  createEvent(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Body() input: SaveMeritEventDto,
    @Req() request: AuthRequest,
  ): Promise<MeritEventResponse> {
    return this.merit.createEvent(this.familyId(request), input);
  }

  @Patch('events/:eventId')
  updateEvent(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() input: SaveMeritEventDto,
    @Req() request: AuthRequest,
  ): Promise<MeritEventResponse> {
    return this.merit.updateEvent(this.familyId(request), eventId, input);
  }

  @Delete('events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeEvent(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Req() request: AuthRequest,
  ): Promise<void> {
    return this.merit.removeEvent(this.familyId(request), eventId);
  }

  @Post('events/:eventId/donations')
  createDonation(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() input: SaveMeritDonationDto,
    @Req() request: AuthRequest,
  ): Promise<MeritDonationResponse> {
    return this.merit.createDonation(this.familyId(request), eventId, input);
  }

  @Patch('donations/:donationId')
  updateDonation(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('donationId', new ParseUUIDPipe()) donationId: string,
    @Body() input: SaveMeritDonationDto,
    @Req() request: AuthRequest,
  ): Promise<MeritDonationResponse> {
    return this.merit.updateDonation(this.familyId(request), donationId, input);
  }

  @Delete('donations/:donationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDonation(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('donationId', new ParseUUIDPipe()) donationId: string,
    @Req() request: AuthRequest,
  ): Promise<void> {
    return this.merit.removeDonation(this.familyId(request), donationId);
  }

  private familyId(request: AuthRequest): string {
    if (!request.familyAccess) {
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    }
    return request.familyAccess.familyId;
  }

  private canManage(request: AuthRequest): boolean {
    return request.familyAccess?.role === UserRole.MEMBER_PLUS;
  }
}
