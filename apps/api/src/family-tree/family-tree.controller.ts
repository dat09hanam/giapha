import { Controller, Get, Inject, Param, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import type { AuthRequest } from '../common/auth/auth.types.js';
import { FamilyAccessGuard } from '../common/auth/family-access.guard.js';
import { FamilyRoles } from '../common/auth/family-roles.decorator.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import { FamilySlugPipe } from '../common/pipes/family-slug.pipe.js';
import { FamilyTreeService } from './family-tree.service.js';
import type { FamilyTreeResponse } from './family-tree.types.js';

@Controller('families/:slug/tree')
@UseGuards(SessionAuthGuard, FamilyAccessGuard)
@FamilyRoles(UserRole.MEMBER_PLUS, UserRole.MEMBER)
export class FamilyTreeController {
  constructor(@Inject(FamilyTreeService) private readonly familyTreeService: FamilyTreeService) {}

  @Get()
  getTree(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Req() request: AuthRequest,
  ): Promise<FamilyTreeResponse> {
    if (!request.familyAccess) throw new UnauthorizedException('Authentication is required');
    return this.familyTreeService.getTree(request.familyAccess.familyId);
  }
}
