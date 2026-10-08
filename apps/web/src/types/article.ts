import type { RichTextDocument } from '@/types/rich-text';

/** Mirrors `ArticleCategory` in the API: Mẫu bài cúng or Thư viện. */
export type ArticleCategory = 'PRAYER' | 'LIBRARY';

/** A card in a public listing. */
export type ArticleSummary = {
  id: string;
  category: ArticleCategory;
  slug: string;
  title: string;
  /** The ADMIN's summary, or the start of the article when they left it blank. */
  summary: string;
  /** API-relative cover path; resolve with `articleCoverSrc`. */
  coverUrl: string | null;
  publishedAt: string | null;
};

/** A published article as a visitor reads it. */
export type Article = ArticleSummary & { content: RichTextDocument; updatedAt: string };

/** Everything the platform ADMIN edits, drafts included. */
export type AdminArticle = {
  id: string;
  category: ArticleCategory;
  slug: string;
  title: string;
  summary: string | null;
  content: RichTextDocument;
  coverUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
