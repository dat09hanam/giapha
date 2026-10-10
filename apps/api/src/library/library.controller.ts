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
/* eslint-disable @typescript-eslint/consistent-type-imports */
import {
  CreateDocumentDto,
  SaveAlbumDto,
  UpdateLibraryItemDto,
  UploadPhotoDto,
} from './library.dto.js';
/* eslint-enable @typescript-eslint/consistent-type-imports */
import {
  LibraryService,
  type AlbumDetailResponse,
  type AlbumSummaryResponse,
  type LibraryItemResponse,
  type LibraryOverviewResponse,
  type LibraryViewer,
} from './library.service.js';

@Controller('families/:slug/library')
@RequiresFamilyFeature('library')
@UseGuards(SessionAuthGuard, FamilyAccessGuard)
@FamilyRoles(UserRole.MEMBER_PLUS)
export class LibraryController {
  constructor(@Inject(LibraryService) private readonly library: LibraryService) {}

  @Get()
  @FamilyRoles(UserRole.MEMBER_PLUS, UserRole.MEMBER)
  overview(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Req() request: AuthRequest,
  ): Promise<LibraryOverviewResponse> {
    return this.library.overview(this.familyId(request), this.viewer(request));
  }

  @Get('albums/:albumId')
  @FamilyRoles(UserRole.MEMBER_PLUS, UserRole.MEMBER)
  album(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('albumId', new ParseUUIDPipe()) albumId: string,
    @Req() request: AuthRequest,
  ): Promise<AlbumDetailResponse> {
    return this.library.album(this.familyId(request), albumId, this.viewer(request));
  }

  @Post('albums')
  createAlbum(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Body() input: SaveAlbumDto,
    @Req() request: AuthRequest,
  ): Promise<AlbumSummaryResponse> {
    return this.library.createAlbum(this.familyId(request), input);
  }

  @Patch('albums/:albumId')
  updateAlbum(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('albumId', new ParseUUIDPipe()) albumId: string,
    @Body() input: SaveAlbumDto,
    @Req() request: AuthRequest,
  ): Promise<AlbumSummaryResponse> {
    return this.library.updateAlbum(this.familyId(request), albumId, input);
  }

  @Delete('albums/:albumId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAlbum(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('albumId', new ParseUUIDPipe()) albumId: string,
    @Req() request: AuthRequest,
  ): Promise<void> {
    return this.library.deleteAlbum(this.familyId(request), albumId);
  }

  @Post('albums/:albumId/photos')
  @FamilyRoles(UserRole.MEMBER_PLUS, UserRole.MEMBER)
  addPhoto(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('albumId', new ParseUUIDPipe()) albumId: string,
    @Body() input: UploadPhotoDto,
    @Req() request: AuthRequest,
  ): Promise<LibraryItemResponse> {
    return this.library.addPhoto(this.familyId(request), albumId, input, this.viewer(request));
  }

  @Post('items/:itemId/approve')
  approvePhoto(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Req() request: AuthRequest,
  ): Promise<LibraryItemResponse> {
    return this.library.approvePhoto(this.familyId(request), itemId);
  }

  @Post('documents')
  createDocument(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Body() input: CreateDocumentDto,
    @Req() request: AuthRequest,
  ): Promise<LibraryItemResponse> {
    return this.library.createDocument(this.familyId(request), input);
  }

  @Patch('items/:itemId')
  updateItem(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() input: UpdateLibraryItemDto,
    @Req() request: AuthRequest,
  ): Promise<LibraryItemResponse> {
    return this.library.updateItem(this.familyId(request), itemId, input);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @FamilyRoles(UserRole.MEMBER_PLUS, UserRole.MEMBER)
  deleteItem(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Req() request: AuthRequest,
  ): Promise<void> {
    return this.library.deleteItem(this.familyId(request), itemId, this.viewer(request));
  }

  private familyId(request: AuthRequest): string {
    if (!request.familyAccess) {
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    }
    return request.familyAccess.familyId;
  }

  private viewer(request: AuthRequest): LibraryViewer {
    if (!request.familyAccess) {
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    }
    return {
      userId: request.familyAccess.userId,
      canManage: request.familyAccess.role === UserRole.MEMBER_PLUS,
    };
  }
}
