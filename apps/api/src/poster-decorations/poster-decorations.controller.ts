import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { FastifyReply } from 'fastify';

import type { AuthRequest } from '../common/auth/auth.types.js';
import { PlatformAdminGuard } from '../common/auth/platform-admin.guard.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
// Runtime import is required for Nest's emitted DTO validation metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  CreatePosterDecorationDto,
  UpdatePosterDecorationDto,
} from './dto/poster-decoration.dto.js';
import type {
  AdminPosterDecorationResponse,
  PosterDecorationResponse,
} from './poster-decoration.types.js';
import { PosterDecorationsService } from './poster-decorations.service.js';

@Controller('poster-decorations')
export class PosterDecorationsController {
  constructor(
    @Inject(PosterDecorationsService) private readonly decorations: PosterDecorationsService,
  ) {}

  /** Signed-in users see the active library; the platform ADMIN sees everything with usage. */
  @Get()
  @UseGuards(SessionAuthGuard)
  list(
    @Req() request: AuthRequest,
  ): Promise<PosterDecorationResponse[] | AdminPosterDecorationResponse[]> {
    return request.auth?.role === UserRole.ADMIN && request.auth.familyId === null
      ? this.decorations.listAll()
      : this.decorations.listActive();
  }

  @Post()
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  create(@Body() input: CreatePosterDecorationDto): Promise<PosterDecorationResponse> {
    return this.decorations.create(input);
  }

  @Patch(':id')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdatePosterDecorationDto,
  ): Promise<PosterDecorationResponse> {
    return this.decorations.update(id, input);
  }

  @Delete(':id')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.decorations.remove(id);
  }

  /** Decoration art is shared platform artwork, not family data, so it is served publicly. */
  @Get(':id/image')
  async image(@Param('id', ParseUUIDPipe) id: string, @Res() reply: FastifyReply): Promise<void> {
    const { bytes, contentType } = await this.decorations.readImage(id);
    await reply
      // Helmet defaults to `same-origin`, which would stop the web app's <img>.
      .header('Cross-Origin-Resource-Policy', 'cross-origin')
      // The URL carries `?v=<updatedAt>`, so a cached copy never goes stale.
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .type(contentType)
      .send(bytes);
  }
}
