import {
  Body,
  Controller,
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
import { AuthService, type InvitationResult } from './auth.service.js';
// Runtime import is required for Nest's emitted DTO validation metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateInvitationDto } from './dto/create-invitation.dto.js';

@Controller('families/:slug/invitations')
@UseGuards(SessionAuthGuard, FamilyAccessGuard)
@FamilyRoles(UserRole.MEMBER_PLUS)
export class FamilyInvitationsController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post()
  createInvitation(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Body() input: CreateInvitationDto,
    @Req() request: AuthRequest,
  ): Promise<InvitationResult> {
    if (!request.familyAccess) throw new UnauthorizedException('Authentication is required');
    return this.authService.createInvitation(request.familyAccess.familyId, input);
  }
}
