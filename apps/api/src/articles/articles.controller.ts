import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ArticleCategory } from '@prisma/client';
import type { FastifyReply } from 'fastify';

import { PlatformAdminGuard } from '../common/auth/platform-admin.guard.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import type {
  AdminArticleResponse,
  ArticleResponse,
  ArticleSummaryResponse,
} from './article.types.js';
import { ArticlesService } from './articles.service.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateArticleDto, ListArticlesQueryDto, UpdateArticleDto } from './dto/article.dto.js';

@Controller('articles')
export class ArticlesController {
  constructor(@Inject(ArticlesService) private readonly articles: ArticlesService) {}

  @Get()
  list(@Query() query: ListArticlesQueryDto): Promise<ArticleSummaryResponse[]> {
    return this.articles.listPublished(query.category);
  }

  @Get('admin')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @Header('Cache-Control', 'no-store')
  listAll(): Promise<AdminArticleResponse[]> {
    return this.articles.listAll();
  }

  @Get('covers/:id')
  async cover(@Param('id', ParseUUIDPipe) id: string, @Res() reply: FastifyReply): Promise<void> {
    const { bytes, contentType } = await this.articles.readCover(id);
    await reply
      .header('Cross-Origin-Resource-Policy', 'cross-origin')
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .type(contentType)
      .send(bytes);
  }

  @Get(':category/:slug')
  get(
    @Param('category', new ParseEnumPipe(ArticleCategory)) category: ArticleCategory,
    @Param('slug') slug: string,
  ): Promise<ArticleResponse> {
    return this.articles.getPublished(category, slug);
  }

  @Post()
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  create(@Body() input: CreateArticleDto): Promise<AdminArticleResponse> {
    return this.articles.create(input);
  }

  @Patch(':id')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateArticleDto,
  ): Promise<AdminArticleResponse> {
    return this.articles.update(id, input);
  }

  @Delete(':id')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.articles.remove(id);
  }
}
