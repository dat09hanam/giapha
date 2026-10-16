import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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

import {
  parseRichText,
  readRichText,
  richTextImageFiles,
  type RichTextDocument,
} from '../common/validation/rich-text.js';
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
import type {
  ArticleCoverDto,
  ArticleImageDto,
  CreateArticleDto,
  UpdateArticleDto,
} from './dto/article.dto.js';

const MAX_COVER_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ARTICLE_FOLDER = 'articles';
/** Pictures placed inside article content, kept apart from the covers. */
const IMAGE_FOLDER = 'images';
const IMAGE_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

const NOT_FOUND = 'Không tìm thấy bài viết.';
const SLUG_TAKEN = 'Đường dẫn này đã có bài viết khác trong cùng mục. Hãy chọn đường dẫn khác.';

function parseContent(value: unknown): RichTextDocument {
  const document = parseRichText(value, 'Nội dung bài viết không hợp lệ.', 'Nội dung bài viết', {
    allowImages: true,
    allowLinks: true,
  });
  if (!document) throw new BadRequestException('Bài viết cần có nội dung.');
  return document;
}

/** Admin-chosen position first; ties (never reordered) keep the newest publication first. */
const ARTICLE_ORDER = [
  { sortOrder: 'asc' },
  { publishedAt: 'desc' },
  { createdAt: 'desc' },
] satisfies Prisma.ArticleOrderByWithRelationInput[];

function isSlugConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

@Injectable()
export class ArticlesService {
  private readonly directory: string;
  private readonly imageDirectory: string;

  constructor(
    @Inject(ConfigService) config: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {
    this.directory = join(resolve(config.getOrThrow<string>('MEDIA_ROOT')), ARTICLE_FOLDER);
    this.imageDirectory = join(this.directory, IMAGE_FOLDER);
  }

  async listPublished(category: ArticleCategory): Promise<ArticleSummaryResponse[]> {
    const records = await this.prisma.article.findMany({
      where: { category, isPublished: true },
      orderBy: ARTICLE_ORDER,
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
      orderBy: [{ category: 'asc' }, ...ARTICLE_ORDER],
      select: articleSelect,
    });
    return records.map(toAdminArticle);
  }

  async create(input: CreateArticleDto): Promise<AdminArticleResponse> {
    const content = parseContent(input.content);
    await this.assertImagesExist(content);
    const coverFile = input.cover ? await this.storeCover(input.cover) : null;
    try {
      const record = await this.prisma.article.create({
        data: {
          sortOrder: await this.bottomOf(input.category),
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
      select: { coverFile: true, publishedAt: true, content: true, category: true },
    });
    if (!existing) throw new NotFoundException(NOT_FOUND);

    const content = input.content === undefined ? undefined : parseContent(input.content);
    if (content) await this.assertImagesExist(content);
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
          ...(input.category === undefined || input.category === existing.category
            ? {}
            : { category: input.category, sortOrder: await this.bottomOf(input.category) }),
          ...(input.slug === undefined ? {} : { slug: input.slug }),
          ...(input.title === undefined ? {} : { title: input.title.trim() }),
          ...(input.summary === undefined ? {} : { summary: input.summary?.trim() || null }),
          ...(content === undefined ? {} : { content }),
          ...(coverFile === undefined ? {} : { coverFile }),
          ...(input.isPublished === undefined
            ? {}
            : {
                isPublished: input.isPublished,
                ...(input.isPublished && !existing.publishedAt ? { publishedAt: new Date() } : {}),
              }),
        },
        select: articleSelect,
      });
      if (coverFile !== undefined && existing.coverFile) await this.removeCover(existing.coverFile);
      if (content) {
        const kept = new Set(richTextImageFiles(content));
        const dropped = richTextImageFiles(readRichText(existing.content)).filter(
          (file) => !kept.has(file),
        );
        await this.removeImages(dropped);
      }
      return toAdminArticle(record);
    } catch (error: unknown) {
      if (coverFile) await this.removeCover(coverFile);
      if (isSlugConflict(error)) throw new ConflictException(SLUG_TAKEN);
      throw error;
    }
  }

  /**
   * Swaps an article with its neighbour in the same category and renumbers that category 1..n,
   * then returns the whole admin list in its new order. `updatedAt` is left as it was: moving is
   * not an edit of the article.
   */
  async move(id: string, direction: 'up' | 'down'): Promise<AdminArticleResponse[]> {
    await this.prisma.$transaction(async (tx) => {
      const article = await tx.article.findUnique({ where: { id }, select: { category: true } });
      if (!article) throw new NotFoundException(NOT_FOUND);
      const siblings = await tx.article.findMany({
        where: { category: article.category },
        orderBy: ARTICLE_ORDER,
        select: { id: true, sortOrder: true, updatedAt: true },
      });
      const from = siblings.findIndex((item) => item.id === id);
      const to = direction === 'up' ? from - 1 : from + 1;
      if (to < 0 || to >= siblings.length) return;
      [siblings[from], siblings[to]] = [siblings[to]!, siblings[from]!];
      for (const [index, item] of siblings.entries()) {
        if (item.sortOrder === index + 1) continue;
        await tx.article.update({
          where: { id: item.id },
          data: { sortOrder: index + 1, updatedAt: item.updatedAt },
        });
      }
    });
    return this.listAll();
  }

  /**
   * A position after every article already in the category, so a new one joins at the end and the
   * order the admin already arranged stays as it is.
   */
  private async bottomOf(category: ArticleCategory): Promise<number> {
    const last = await this.prisma.article.aggregate({
      where: { category },
      _max: { sortOrder: true },
    });
    return (last._max.sortOrder ?? 0) + 1;
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.article.findUnique({
      where: { id },
      select: { coverFile: true, content: true },
    });
    if (!existing) throw new NotFoundException(NOT_FOUND);

    await this.prisma.article.delete({ where: { id } });
    if (existing.coverFile) await this.removeCover(existing.coverFile);
    await this.removeImages(richTextImageFiles(readRichText(existing.content)));
  }

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

  /** Saves a picture for article content; it is shown once an article that uses it is saved. */
  async storeImage(input: ArticleImageDto): Promise<{ file: string }> {
    const { bytes, extension } = decodeImage(input.contentType, input.data, MAX_IMAGE_BYTES);
    const file = `${randomUUID()}.${extension}`;
    await mkdir(this.imageDirectory, { recursive: true });
    await writeFile(join(this.imageDirectory, file), bytes);
    return { file };
  }

  async readImage(file: string): Promise<{ bytes: Buffer; contentType: string }> {
    const contentType = IMAGE_FILE.test(file)
      ? CONTENT_TYPE_BY_EXTENSION[file.split('.').pop() ?? '']
      : undefined;
    if (!contentType) throw new NotFoundException('Không tìm thấy hình ảnh.');
    try {
      return { bytes: await readFile(join(this.imageDirectory, file)), contentType };
    } catch {
      throw new NotFoundException('Không tìm thấy hình ảnh.');
    }
  }

  private async assertImagesExist(document: RichTextDocument): Promise<void> {
    for (const file of richTextImageFiles(document)) {
      try {
        await access(join(this.imageDirectory, file));
      } catch {
        throw new BadRequestException(
          'Có hình ảnh trong bài viết không còn trên máy chủ. Hãy xóa và chèn lại ảnh đó.',
        );
      }
    }
  }

  private async removeImages(files: readonly string[]): Promise<void> {
    await Promise.all(
      files
        .filter((file) => IMAGE_FILE.test(file))
        .map((file) => rm(join(this.imageDirectory, file), { force: true })),
    );
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
