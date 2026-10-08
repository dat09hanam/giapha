import type { Metadata } from 'next';

import { articleMetadata, ArticleRoute } from '@/components/articles/article-routes';

export const dynamic = 'force-dynamic';

type ArticlePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  return articleMetadata('PRAYER', (await params).slug);
}

/** One published article of Mẫu bài cúng. */
export default async function ArticlePage({ params }: ArticlePageProps) {
  return <ArticleRoute category="PRAYER" slug={(await params).slug} />;
}
