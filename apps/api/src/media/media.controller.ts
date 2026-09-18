import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { FastifyReply } from 'fastify';

import type { AuthRequest } from '../common/auth/auth.types.js';
import { FamilyAccessGuard } from '../common/auth/family-access.guard.js';
import { FamilyRoles } from '../common/auth/family-roles.decorator.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import { FamilySlugPipe } from '../common/pipes/family-slug.pipe.js';
// Runtime import is required for Nest's emitted DTO validation metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UploadFamilyMediaDto } from './dto/upload-family-media.dto.js';
import { MediaService } from './media.service.js';
import type { UploadedMediaResponse } from './media.types.js';

@Controller('families/:slug/media')
@UseGuards(SessionAuthGuard, FamilyAccessGuard)
@FamilyRoles(UserRole.MEMBER_PLUS, UserRole.MEMBER)
export class MediaController {
  constructor(@Inject(MediaService) private readonly mediaService: MediaService) {}

  @Post()
  @FamilyRoles(UserRole.MEMBER_PLUS)
  upload(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Body() input: UploadFamilyMediaDto,
    @Req() request: AuthRequest,
  ): Promise<UploadedMediaResponse> {
    return this.mediaService.saveImage(this.getFamilyId(request), input);
  }

  @Get(':fileName')
  async serve(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('fileName') fileName: string,
    @Req() request: AuthRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const { bytes, contentType } = await this.mediaService.readImage(
      this.getFamilyId(request),
      fileName,
    );

    await reply
      // Helmet defaults every response to `same-origin`, which stops the web app
      // on another origin from rendering these in an <img>. Access is still
      // gated by the guards above; this only permits embedding.
      .header('Cross-Origin-Resource-Policy', 'cross-origin')
      // Names are content-addressed by UUID, so a cached copy can never go stale.
      .header('Cache-Control', 'private, max-age=31536000, immutable')
      .type(contentType)
      .send(bytes);
  }

  @Delete(':fileName')
  @FamilyRoles(UserRole.MEMBER_PLUS)
  @HttpCode(204)
  remove(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('fileName') fileName: string,
    @Req() request: AuthRequest,
  ): Promise<void> {
    return this.mediaService.deleteImage(this.getFamilyId(request), fileName);
  }

  private getFamilyId(request: AuthRequest): string {
    if (!request.familyAccess) {
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    }

    return request.familyAccess.familyId;
  }
}
