import { apiFetch } from '@/lib/api-error';
import { compressImage } from '@/lib/image-compress';
import { foldVietnamese } from '@/lib/person-search';
import type { AdminArticle, ArticleCategory } from '@/types/article';
import type { RichTextDocument, RichTextImage } from '@/types/rich-text';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

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
  if (coverUrl.startsWith('blob:')) return coverUrl;
  return API_URL + coverUrl;
}

export function articleSlug(title: string): string {
  return foldVietnamese(title)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160)
    .replace(/-+$/, '');
}

export const MAX_ARTICLE_COVER_BYTES = 3 * 1024 * 1024;
const MAX_ARTICLE_IMAGE_BYTES = 3 * 1024 * 1024;

/** Address of a picture placed inside article content. */
export function articleImageSrc(file: string): string {
  return `${API_URL}/articles/images/${encodeURIComponent(file)}`;
}

/** Shrinks a picture in the browser, uploads it and returns what an image block stores. */
export async function uploadArticleImage(file: File): Promise<RichTextImage> {
  const image = await compressImage(file, MAX_ARTICLE_IMAGE_BYTES, { maxEdge: 1600 });
  URL.revokeObjectURL(image.previewUrl);
  const stored = await apiFetch<{ file: string }>(
    `${API_URL}/articles/images`,
    {
      method: 'POST',
      credentials: 'include',
      headers: JSON_HEADERS,
      body: JSON.stringify({ contentType: image.contentType, data: image.data }),
    },
    'tải ảnh lên',
  );
  return { type: 'image', file: stored.file, width: image.width, height: image.height };
}

export type ArticleCoverUpload = { contentType: string; data: string };

export type ArticleInput = {
  category: ArticleCategory;
  title: string;
  slug: string;
  summary: string | null;
  content: RichTextDocument;
  isPublished: boolean;
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

/** Swaps the article with its neighbour in the same category; returns the reordered list. */
export function moveArticle(id: string, direction: 'up' | 'down'): Promise<AdminArticle[]> {
  return apiFetch<AdminArticle[]>(
    `${API_URL}/articles/${encodeURIComponent(id)}/position`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: JSON_HEADERS,
      body: JSON.stringify({ direction }),
    },
    'đổi thứ tự bài viết',
  );
}

export function deleteArticle(id: string): Promise<void> {
  return apiFetch<void>(
    `${API_URL}/articles/${encodeURIComponent(id)}`,
    { method: 'DELETE', credentials: 'include', headers: { Accept: 'application/json' } },
    'xoá bài viết',
  );
}
