import {
  Body,
  Controller,
  Delete,
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
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import { FamilyAccessGuard } from '../common/auth/family-access.guard.js';
import { FamilyRoles } from '../common/auth/family-roles.decorator.js';
import { FamilySlugPipe } from '../common/pipes/family-slug.pipe.js';
// Runtime imports are required for Nest's emitted DTO validation metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreatePersonDto } from './dto/create-person.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdatePersonDto } from './dto/update-person.dto.js';
import { FamilyTreeService } from './family-tree.service.js';
import type { PersonResponse } from './family-tree.types.js';

@Controller('families/:slug/people')
@UseGuards(SessionAuthGuard, FamilyAccessGuard)
@FamilyRoles(UserRole.MEMBER_PLUS)
export class PeopleController {
  constructor(@Inject(FamilyTreeService) private readonly familyTreeService: FamilyTreeService) {}

  @Post()
  createPerson(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Body() input: CreatePersonDto,
    @Req() request: AuthRequest,
  ): Promise<PersonResponse> {
    return this.familyTreeService.createPerson(this.getFamilyId(request), input);
  }

  @Patch(':personId')
  updatePerson(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('personId', new ParseUUIDPipe()) personId: string,
    @Body() input: UpdatePersonDto,
    @Req() request: AuthRequest,
  ): Promise<PersonResponse> {
    return this.familyTreeService.updatePerson(this.getFamilyId(request), personId, input);
  }

  @Delete(':personId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePerson(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('personId', new ParseUUIDPipe()) personId: string,
    @Req() request: AuthRequest,
  ): Promise<void> {
    return this.familyTreeService.deletePerson(this.getFamilyId(request), personId);
  }

  private getFamilyId(request: AuthRequest): string {
    if (!request.familyAccess) {
      throw new UnauthorizedException('Authentication is required');
    }

    return request.familyAccess.familyId;
  }
}
