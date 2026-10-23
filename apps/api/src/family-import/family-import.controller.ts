import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
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
import { ImportFamilyTreeDto } from './dto/import-family-tree.dto.js';
import { FamilyImportService } from './family-import.service.js';
import type { FamilyImportResponse } from './family-import.types.js';

/** Spreadsheet import of a family tree; only the clan head may run it. */
@Controller('families/:slug/import')
@UseGuards(SessionAuthGuard, FamilyAccessGuard)
@FamilyRoles(UserRole.MEMBER_PLUS)
export class FamilyImportController {
  constructor(@Inject(FamilyImportService) private readonly importService: FamilyImportService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  importTree(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Body() input: ImportFamilyTreeDto,
    @Req() request: AuthRequest,
  ): Promise<FamilyImportResponse> {
    if (!request.familyAccess) {
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    }
    return this.importService.importTree(request.familyAccess.familyId, input);
  }
}
