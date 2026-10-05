import {
  Body,
  Controller,
  Get,
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
// Runtime imports are required for Nest's emitted DTO validation metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateEditSuggestionDto } from './dto/create-edit-suggestion.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateEditSuggestionDto } from './dto/update-edit-suggestion.dto.js';
import { EditSuggestionsService } from './edit-suggestions.service.js';
import type {
  CreatedEditSuggestionResponse,
  EditSuggestionResponse,
} from './edit-suggestions.types.js';

/**
 * Any member of the family may propose a change to a Person; only the clan
 * head (MEMBER_PLUS) reads the suggestions and marks them handled.
 */
@Controller('families/:slug')
@UseGuards(SessionAuthGuard, FamilyAccessGuard)
@FamilyRoles(UserRole.MEMBER_PLUS)
export class EditSuggestionsController {
  constructor(
    @Inject(EditSuggestionsService) private readonly suggestions: EditSuggestionsService,
  ) {}

  @Post('people/:personId/suggestions')
  @RequiresFamilyFeature('editSuggestions')
  @FamilyRoles(UserRole.MEMBER_PLUS, UserRole.MEMBER)
  create(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('personId', new ParseUUIDPipe()) personId: string,
    @Body() input: CreateEditSuggestionDto,
    @Req() request: AuthRequest,
  ): Promise<CreatedEditSuggestionResponse> {
    return this.suggestions.create(this.getFamilyId(request), personId, input);
  }

  @Get('suggestions')
  list(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Req() request: AuthRequest,
  ): Promise<EditSuggestionResponse[]> {
    return this.suggestions.list(this.getFamilyId(request));
  }

  @Patch('suggestions/:suggestionId')
  updateStatus(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('suggestionId', new ParseUUIDPipe()) suggestionId: string,
    @Body() input: UpdateEditSuggestionDto,
    @Req() request: AuthRequest,
  ): Promise<EditSuggestionResponse> {
    return this.suggestions.updateStatus(this.getFamilyId(request), suggestionId, input.status);
  }

  private getFamilyId(request: AuthRequest): string {
    if (!request.familyAccess) {
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    }
    return request.familyAccess.familyId;
  }
}
