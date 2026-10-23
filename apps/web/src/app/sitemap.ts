import type { MetadataRoute } from 'next';

import { getArticles } from '@/lib/api';
import { ARTICLE_SECTIONS, articleHref } from '@/lib/article-api';
import { SITE_URL } from '@/lib/seo';
import type { ArticleCategory } from '@/types/article';

// Built on every request so newly published articles appear without a rebuild.
export const dynamic = 'force-dynamic';

const STATIC_PAGES: readonly { path: string; priority: number }[] = [
  { path: '/', priority: 1 },
  { path: '/gia-pha-mau', priority: 0.8 },
  { path: '/dai-su', priority: 0.7 },
  { path: ARTICLE_SECTIONS.LIBRARY.path, priority: 0.8 },
  { path: ARTICLE_SECTIONS.PRAYER.path, priority: 0.8 },
  { path: '/dang-ky', priority: 0.5 },
  { path: '/chinh-sach-bao-mat', priority: 0.2 },
  { path: '/quy-dinh-su-dung', priority: 0.2 },
];

/** Family pages require sign-in, so only public pages and published articles are listed. */
async function articleEntries(category: ArticleCategory): Promise<MetadataRoute.Sitemap> {
  try {
    const articles = await getArticles(category);
    return articles.map((article) => ({
      url: SITE_URL + articleHref(category, article.slug),
      lastModified: article.publishedAt ?? undefined,
      priority: 0.6,
    }));
  } catch {
    // An unreachable API still yields a sitemap with the static pages.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [library, prayers] = await Promise.all([
    articleEntries('LIBRARY'),
    articleEntries('PRAYER'),
  ]);
  const pages = STATIC_PAGES.map(({ path, priority }) => ({
    url: SITE_URL + (path === '/' ? '' : path),
    priority,
  }));
  return [...pages, ...library, ...prayers];
}
