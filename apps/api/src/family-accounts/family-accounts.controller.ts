import {
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
  Patch,
  Post,
  Put,
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
// Runtime import is required for Nest's emitted DTO validation metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  CreateFamilyAccountDto,
  ResetFamilyAccountPasswordDto,
  SetBranchesDto,
  UpdateFamilyAccountDto,
} from './family-accounts.dto.js';
import {
  FamilyAccountsService,
  type FamilyAccount,
  type FamilyAccountWithPassword,
} from './family-accounts.service.js';

/** Member accounts and their chi/nhánh assignments, managed by the family head (MEMBER_PLUS). */
@Controller('families/:slug/accounts')
@UseGuards(SessionAuthGuard, FamilyAccessGuard)
@FamilyRoles(UserRole.MEMBER_PLUS)
export class FamilyAccountsController {
  constructor(@Inject(FamilyAccountsService) private readonly accounts: FamilyAccountsService) {}

  @Get()
  list(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Req() request: AuthRequest,
  ): Promise<FamilyAccount[]> {
    return this.accounts.list(this.familyId(request));
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  create(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Body() input: CreateFamilyAccountDto,
    @Req() request: AuthRequest,
  ): Promise<FamilyAccountWithPassword> {
    return this.accounts.create(this.familyId(request), input);
  }

  @Patch(':userId')
  update(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() input: UpdateFamilyAccountDto,
    @Req() request: AuthRequest,
  ): Promise<FamilyAccount> {
    return this.accounts.update(this.familyId(request), userId, input);
  }

  @Post(':userId/password')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  resetPassword(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() input: ResetFamilyAccountPasswordDto,
    @Req() request: AuthRequest,
  ): Promise<FamilyAccountWithPassword> {
    return this.accounts.resetPassword(this.familyId(request), userId, input);
  }

  @Put(':userId/branches')
  setBranches(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() input: SetBranchesDto,
    @Req() request: AuthRequest,
  ): Promise<FamilyAccount> {
    return this.accounts.setBranches(this.familyId(request), userId, input);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Req() request: AuthRequest,
  ): Promise<void> {
    return this.accounts.remove(this.familyId(request), userId);
  }

  private familyId(request: AuthRequest): string {
    if (!request.familyAccess) {
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    }
    return request.familyAccess.familyId;
  }
}
