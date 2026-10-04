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
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import { FamilySlugPipe } from '../common/pipes/family-slug.pipe.js';
// Runtime imports are required for Nest's emitted DTO validation metadata.
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
} from './library.service.js';

/** Album và tư liệu: every member views; only the clan head (MEMBER_PLUS) keeps the library. */
@Controller('families/:slug/library')
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
    return this.library.overview(this.familyId(request), this.canManage(request));
  }

  @Get('albums/:albumId')
  @FamilyRoles(UserRole.MEMBER_PLUS, UserRole.MEMBER)
  album(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('albumId', new ParseUUIDPipe()) albumId: string,
    @Req() request: AuthRequest,
  ): Promise<AlbumDetailResponse> {
    return this.library.album(this.familyId(request), albumId, this.canManage(request));
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
  addPhoto(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('albumId', new ParseUUIDPipe()) albumId: string,
    @Body() input: UploadPhotoDto,
    @Req() request: AuthRequest,
  ): Promise<LibraryItemResponse> {
    return this.library.addPhoto(this.familyId(request), albumId, input);
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
  deleteItem(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Req() request: AuthRequest,
  ): Promise<void> {
    return this.library.deleteItem(this.familyId(request), itemId);
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
