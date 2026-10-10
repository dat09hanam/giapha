import type { Metadata } from 'next';

import { articleMetadata, ArticleRoute } from '@/components/articles/article-routes';

export const dynamic = 'force-dynamic';

type ArticlePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  return articleMetadata('LIBRARY', (await params).slug);
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  return <ArticleRoute category="LIBRARY" slug={(await params).slug} />;
}
