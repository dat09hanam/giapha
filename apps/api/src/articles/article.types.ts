import type { ArticleCategory, Prisma } from '@prisma/client';

import { readRichText, type RichTextDocument } from '../common/validation/rich-text.js';

export const articleSelect = {
  id: true,
  category: true,
  slug: true,
  title: true,
  summary: true,
  content: true,
  coverFile: true,
  isPublished: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ArticleSelect;

export type ArticleRecord = Prisma.ArticleGetPayload<{ select: typeof articleSelect }>;

/** A card in a public listing. */
export type ArticleSummaryResponse = {
  id: string;
  category: ArticleCategory;
  slug: string;
  title: string;
  /** The ADMIN's summary, or the start of the article when they left it blank. */
  summary: string;
  /** API-relative cover path, versioned so caches refresh on change; null without a cover. */
  coverUrl: string | null;
  publishedAt: string | null;
};

/** A published article as a visitor reads it. */
export type ArticleResponse = ArticleSummaryResponse & {
  content: RichTextDocument;
  updatedAt: string;
};

/** Everything the platform ADMIN edits, drafts included. */
export type AdminArticleResponse = {
  id: string;
  category: ArticleCategory;
  slug: string;
  title: string;
  /** Exactly what the ADMIN typed; null when left blank. */
  summary: string | null;
  content: RichTextDocument;
  coverUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const EMPTY_DOCUMENT: RichTextDocument = { version: 1, blocks: [] };
const EXCERPT_LENGTH = 220;

function contentOf(record: ArticleRecord): RichTextDocument {
  return readRichText(record.content) ?? EMPTY_DOCUMENT;
}

/** The opening prose, skipping headings and lists, which read badly run together. */
function excerpt(document: RichTextDocument): string {
  const text = document.blocks
    .flatMap((block) =>
      block.type === 'paragraph' || block.type === 'quote'
        ? [block.content.map((run) => run.text).join('')]
        : [],
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= EXCERPT_LENGTH) return text;
  const cut = text.slice(0, EXCERPT_LENGTH);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), EXCERPT_LENGTH - 40))}…`;
}

function coverUrl(record: ArticleRecord): string | null {
  return record.coverFile
    ? `/articles/covers/${record.id}?v=${record.updatedAt.getTime().toString(36)}`
    : null;
}

export function toArticleSummary(record: ArticleRecord): ArticleSummaryResponse {
  return {
    id: record.id,
    category: record.category,
    slug: record.slug,
    title: record.title,
    summary: record.summary ?? excerpt(contentOf(record)),
    coverUrl: coverUrl(record),
    publishedAt: record.publishedAt?.toISOString() ?? null,
  };
}

export function toArticleResponse(record: ArticleRecord): ArticleResponse {
  return {
    ...toArticleSummary(record),
    content: contentOf(record),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toAdminArticle(record: ArticleRecord): AdminArticleResponse {
  return {
    id: record.id,
    category: record.category,
    slug: record.slug,
    title: record.title,
    summary: record.summary,
    content: contentOf(record),
    coverUrl: coverUrl(record),
    isPublished: record.isPublished,
    publishedAt: record.publishedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
