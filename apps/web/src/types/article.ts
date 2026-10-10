import type { RichTextDocument } from '@/types/rich-text';

export type ArticleCategory = 'PRAYER' | 'LIBRARY';

export type ArticleSummary = {
  id: string;
  category: ArticleCategory;
  slug: string;
  title: string;
  summary: string;
  coverUrl: string | null;
  publishedAt: string | null;
};

export type Article = ArticleSummary & { content: RichTextDocument; updatedAt: string };

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
