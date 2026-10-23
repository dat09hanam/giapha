import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import type { AuthRequest, FamilyAccess } from '../common/auth/auth.types.js';
import { AuthThrottleGuard } from '../common/auth/auth-throttle.guard.js';
import { FamilyAccessGuard } from '../common/auth/family-access.guard.js';
import { FamilyRoles } from '../common/auth/family-roles.decorator.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import { todayInVietnam } from '../common/lunar-calendar.js';
import { FamilySlugPipe } from '../common/pipes/family-slug.pipe.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  CreateAnniversaryReminderDto,
  UnsubscribeAnniversaryReminderDto,
} from './anniversaries.dto.js';
import {
  AnniversariesService,
  type AnniversaryCalendar,
  type CreatedAnniversaryReminder,
} from './anniversaries.service.js';

const MIN_YEAR = 1900;
const MAX_YEAR = 2199;

/** Lịch giỗ: every family member sees the anniversaries and may ask to be reminded by email. */
@Controller('families/:slug/anniversaries')
@UseGuards(SessionAuthGuard, FamilyAccessGuard)
@FamilyRoles(UserRole.MEMBER_PLUS, UserRole.MEMBER)
export class AnniversariesController {
  constructor(@Inject(AnniversariesService) private readonly anniversaries: AnniversariesService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  calendar(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Query('year') yearText: string | undefined,
    @Req() request: AuthRequest,
  ): Promise<AnniversaryCalendar> {
    const year = yearText === undefined ? todayInVietnam().year : Number(yearText);
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
      throw new BadRequestException(`Năm phải từ ${MIN_YEAR} đến ${MAX_YEAR}.`);
    }
    const access = this.access(request);
    return this.anniversaries.calendar(access.familyId, access.userId, year);
  }

  @Post('reminders')
  createReminder(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Body() input: CreateAnniversaryReminderDto,
    @Req() request: AuthRequest,
  ): Promise<CreatedAnniversaryReminder> {
    const access = this.access(request);
    return this.anniversaries.createReminder(access.familyId, access.slug, access.userId, input);
  }

  @Delete('reminders/:reminderId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteReminder(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('reminderId', new ParseUUIDPipe()) reminderId: string,
    @Req() request: AuthRequest,
  ): Promise<void> {
    const access = this.access(request);
    return this.anniversaries.deleteReminder(
      access.familyId,
      access.userId,
      access.role === UserRole.MEMBER_PLUS,
      reminderId,
    );
  }

  private access(request: AuthRequest): FamilyAccess {
    if (!request.familyAccess) {
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    }
    return request.familyAccess;
  }
}

/** The unsubscribe link of a reminder email; public, the token is the credential. */
@Controller('anniversary-reminders')
export class AnniversaryUnsubscribeController {
  constructor(@Inject(AnniversariesService) private readonly anniversaries: AnniversariesService) {}

  @Post('unsubscribe')
  @UseGuards(AuthThrottleGuard)
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  unsubscribe(
    @Body() input: UnsubscribeAnniversaryReminderDto,
  ): Promise<{ personName: string; familyName: string }> {
    return this.anniversaries.unsubscribe(input.token);
  }
}
