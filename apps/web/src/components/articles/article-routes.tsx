import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ArticleListView, ArticleView } from '@/components/articles/article-views';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { ApiNotFoundError, getArticle, getArticles } from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import { ARTICLE_SECTIONS, articleCoverSrc } from '@/lib/article-api';
import { SITE_BRAND } from '@/lib/site-brand';
import type { ArticleCategory } from '@/types/article';

const RELATED_COUNT = 3;

export function sectionMetadata(category: ArticleCategory): Metadata {
  const section = ARTICLE_SECTIONS[category];
  return {
    description: section.description,
    openGraph: { title: `${section.label} · ${SITE_BRAND.name}`, description: section.description },
  };
}

export async function articleMetadata(category: ArticleCategory, slug: string): Promise<Metadata> {
  try {
    const article = await getArticle(category, slug);
    const cover = articleCoverSrc(article.coverUrl);
    return {
      description: article.summary,
      openGraph: {
        type: 'article',
        title: article.title,
        description: article.summary,
        ...(article.publishedAt ? { publishedTime: article.publishedAt } : {}),
        ...(cover ? { images: [cover] } : {}),
      },
    };
  } catch {
    return sectionMetadata(category);
  }
}

export async function ArticleListRoute({
  category,
  searchable,
  initialQuery,
}: {
  category: ArticleCategory;
  searchable?: boolean;
  initialQuery?: string;
}) {
  try {
    return (
      <ArticleListView
        category={category}
        articles={await getArticles(category)}
        searchable={searchable}
        initialQuery={initialQuery}
      />
    );
  } catch (error: unknown) {
    if (error instanceof ApiRequestError) {
      return (
        <ApiErrorState
          title="Chưa thể tải danh sách bài viết"
          message={error.message}
          retryHref={ARTICLE_SECTIONS[category].path}
        />
      );
    }
    throw error;
  }
}

export async function ArticleRoute({
  category,
  slug,
}: {
  category: ArticleCategory;
  slug: string;
}) {
  try {
    const [article, all] = await Promise.all([getArticle(category, slug), getArticles(category)]);
    const related = all.filter((item) => item.id !== article.id).slice(0, RELATED_COUNT);
    return <ArticleView article={article} related={related} />;
  } catch (error: unknown) {
    if (error instanceof ApiNotFoundError) notFound();
    if (error instanceof ApiRequestError) {
      return (
        <ApiErrorState
          title="Chưa thể tải bài viết"
          message={error.message}
          retryHref={`${ARTICLE_SECTIONS[category].path}/${encodeURIComponent(slug)}`}
        />
      );
    }
    throw error;
  }
}
