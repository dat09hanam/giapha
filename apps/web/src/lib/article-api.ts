import { apiFetch } from '@/lib/api-error';
import { foldVietnamese } from '@/lib/person-search';
import type { AdminArticle, ArticleCategory } from '@/types/article';
import type { RichTextDocument } from '@/types/rich-text';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

/** The two public sections, keyed by category: their path, names and blurb. */
export const ARTICLE_SECTIONS: Record<
  ArticleCategory,
  { path: string; label: string; heading: string; description: string }
> = {
  PRAYER: {
    path: '/mau-bai-cung',
    label: 'Mẫu bài cúng',
    heading: 'Văn khấn và bài cúng truyền thống',
    description:
      'Văn khấn ngày giỗ, rằm, mùng một, lễ Tết và các nghi lễ dòng họ, soạn sẵn để con cháu đọc khi thắp hương.',
  },
  LIBRARY: {
    path: '/thu-vien',
    label: 'Thư viện',
    heading: 'Kiến thức gia phả và phong tục',
    description:
      'Bài viết về cách lập gia phả, cách xưng hô, phong tục thờ cúng và giữ gìn truyền thống dòng họ Việt.',
  },
};

export function articleHref(category: ArticleCategory, slug: string): string {
  return `${ARTICLE_SECTIONS[category].path}/${encodeURIComponent(slug)}`;
}

export function articleCoverSrc(coverUrl: string | null): string | null {
  if (!coverUrl) return null;
  // A local preview of a file the ADMIN has picked but not saved yet.
  if (coverUrl.startsWith('blob:')) return coverUrl;
  return API_URL + coverUrl;
}

/** "Văn khấn ngày giỗ" → "van-khan-ngay-gio", within the API's 160 characters. */
export function articleSlug(title: string): string {
  return foldVietnamese(title)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160)
    .replace(/-+$/, '');
}

/** Matches the API's limit on cover uploads. */
export const MAX_ARTICLE_COVER_BYTES = 3 * 1024 * 1024;

export type ArticleCoverUpload = { contentType: string; data: string };

export type ArticleInput = {
  category: ArticleCategory;
  title: string;
  slug: string;
  summary: string | null;
  content: RichTextDocument;
  isPublished: boolean;
  /** A new cover, or null to remove the current one; left out to keep it. */
  cover?: ArticleCoverUpload | null;
};

const JSON_HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };

export function createArticle(input: ArticleInput): Promise<AdminArticle> {
  return apiFetch<AdminArticle>(
    `${API_URL}/articles`,
    { method: 'POST', credentials: 'include', headers: JSON_HEADERS, body: JSON.stringify(input) },
    'đăng bài viết',
  );
}

export function updateArticle(id: string, input: Partial<ArticleInput>): Promise<AdminArticle> {
  return apiFetch<AdminArticle>(
    `${API_URL}/articles/${encodeURIComponent(id)}`,
    { method: 'PATCH', credentials: 'include', headers: JSON_HEADERS, body: JSON.stringify(input) },
    'cập nhật bài viết',
  );
}

export function deleteArticle(id: string): Promise<void> {
  return apiFetch<void>(
    `${API_URL}/articles/${encodeURIComponent(id)}`,
    { method: 'DELETE', credentials: 'include', headers: { Accept: 'application/json' } },
    'xoá bài viết',
  );
}
