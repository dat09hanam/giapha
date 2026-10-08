import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type ArticleCategory } from '@prisma/client';

import { parseRichText, type RichTextDocument } from '../common/validation/rich-text.js';
import { PrismaService } from '../database/prisma.service.js';
import { CONTENT_TYPE_BY_EXTENSION, decodeImage, STORED_FILE_NAME } from '../media/image-format.js';
import {
  articleSelect,
  toAdminArticle,
  toArticleResponse,
  toArticleSummary,
  type AdminArticleResponse,
  type ArticleResponse,
  type ArticleSummaryResponse,
} from './article.types.js';
import type { ArticleCoverDto, CreateArticleDto, UpdateArticleDto } from './dto/article.dto.js';

const MAX_COVER_BYTES = 3 * 1024 * 1024;
const ARTICLE_FOLDER = 'articles';

const NOT_FOUND = 'Không tìm thấy bài viết.';
const SLUG_TAKEN = 'Đường dẫn này đã có bài viết khác trong cùng mục. Hãy chọn đường dẫn khác.';

function parseContent(value: unknown): RichTextDocument {
  const document = parseRichText(value, 'Nội dung bài viết không hợp lệ.', 'Nội dung bài viết');
  if (!document) throw new BadRequestException('Bài viết cần có nội dung.');
  return document;
}

function isSlugConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * Mẫu bài cúng and Thư viện: platform-wide articles the platform ADMIN writes for the public
 * site. Not family data, so nothing here is scoped to a tenant; visitors only ever see
 * published articles.
 */
@Injectable()
export class ArticlesService {
  private readonly directory: string;

  constructor(
    @Inject(ConfigService) config: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {
    this.directory = join(resolve(config.getOrThrow<string>('MEDIA_ROOT')), ARTICLE_FOLDER);
  }

  async listPublished(category: ArticleCategory): Promise<ArticleSummaryResponse[]> {
    const records = await this.prisma.article.findMany({
      where: { category, isPublished: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: articleSelect,
    });
    return records.map(toArticleSummary);
  }

  async getPublished(category: ArticleCategory, slug: string): Promise<ArticleResponse> {
    const record = await this.prisma.article.findFirst({
      where: { category, slug, isPublished: true },
      select: articleSelect,
    });
    if (!record) throw new NotFoundException(NOT_FOUND);
    return toArticleResponse(record);
  }

  async listAll(): Promise<AdminArticleResponse[]> {
    const records = await this.prisma.article.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      select: articleSelect,
    });
    return records.map(toAdminArticle);
  }

  async create(input: CreateArticleDto): Promise<AdminArticleResponse> {
    const content = parseContent(input.content);
    const coverFile = input.cover ? await this.storeCover(input.cover) : null;
    try {
      const record = await this.prisma.article.create({
        data: {
          category: input.category,
          slug: input.slug,
          title: input.title.trim(),
          summary: input.summary?.trim() || null,
          content,
          coverFile,
          isPublished: input.isPublished ?? false,
          publishedAt: input.isPublished ? new Date() : null,
        },
        select: articleSelect,
      });
      return toAdminArticle(record);
    } catch (error: unknown) {
      if (coverFile) await this.removeCover(coverFile);
      if (isSlugConflict(error)) throw new ConflictException(SLUG_TAKEN);
      throw error;
    }
  }

  async update(id: string, input: UpdateArticleDto): Promise<AdminArticleResponse> {
    const existing = await this.prisma.article.findUnique({
      where: { id },
      select: { coverFile: true, publishedAt: true },
    });
    if (!existing) throw new NotFoundException(NOT_FOUND);

    const content = input.content === undefined ? undefined : parseContent(input.content);
    const coverFile =
      input.cover === undefined
        ? undefined
        : input.cover === null
          ? null
          : await this.storeCover(input.cover);
    try {
      const record = await this.prisma.article.update({
        where: { id },
        data: {
          ...(input.category === undefined ? {} : { category: input.category }),
          ...(input.slug === undefined ? {} : { slug: input.slug }),
          ...(input.title === undefined ? {} : { title: input.title.trim() }),
          ...(input.summary === undefined ? {} : { summary: input.summary?.trim() || null }),
          ...(content === undefined ? {} : { content }),
          ...(coverFile === undefined ? {} : { coverFile }),
          ...(input.isPublished === undefined
            ? {}
            : {
                isPublished: input.isPublished,
                // The first publication date stays, so re-showing an article keeps its place.
                ...(input.isPublished && !existing.publishedAt ? { publishedAt: new Date() } : {}),
              }),
        },
        select: articleSelect,
      });
      if (coverFile !== undefined && existing.coverFile) await this.removeCover(existing.coverFile);
      return toAdminArticle(record);
    } catch (error: unknown) {
      if (coverFile) await this.removeCover(coverFile);
      if (isSlugConflict(error)) throw new ConflictException(SLUG_TAKEN);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.article.findUnique({
      where: { id },
      select: { coverFile: true },
    });
    if (!existing) throw new NotFoundException(NOT_FOUND);

    await this.prisma.article.delete({ where: { id } });
    if (existing.coverFile) await this.removeCover(existing.coverFile);
  }

  /** A cover image; drafts' covers too, so the ADMIN can preview them. */
  async readCover(id: string): Promise<{ bytes: Buffer; contentType: string }> {
    const record = await this.prisma.article.findUnique({
      where: { id },
      select: { coverFile: true },
    });
    const fileName = record?.coverFile;
    if (!fileName || !STORED_FILE_NAME.test(fileName)) throw new NotFoundException(NOT_FOUND);

    const contentType = CONTENT_TYPE_BY_EXTENSION[fileName.split('.').pop() ?? ''];
    if (!contentType) throw new NotFoundException(NOT_FOUND);
    try {
      return { bytes: await readFile(join(this.directory, fileName)), contentType };
    } catch {
      throw new NotFoundException(NOT_FOUND);
    }
  }

  private async storeCover(cover: ArticleCoverDto): Promise<string> {
    const { bytes, extension } = decodeImage(cover.contentType, cover.data, MAX_COVER_BYTES);
    const fileName = `${randomUUID()}.${extension}`;
    await mkdir(this.directory, { recursive: true });
    await writeFile(join(this.directory, fileName), bytes);
    return fileName;
  }

  private async removeCover(fileName: string): Promise<void> {
    if (!STORED_FILE_NAME.test(fileName)) return;
    await rm(join(this.directory, fileName), { force: true });
  }
}
