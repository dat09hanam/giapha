import { ArticleListRoute, sectionMetadata } from '@/components/articles/article-routes';

export const metadata = sectionMetadata('PRAYER');

export const dynamic = 'force-dynamic';

type PrayerListPageProps = { searchParams: Promise<{ q?: string | string[] }> };

export default async function ArticlesPage({ searchParams }: PrayerListPageProps) {
  const { q } = await searchParams;
  return (
    <ArticleListRoute
      category="PRAYER"
      searchable
      initialQuery={(Array.isArray(q) ? q[0] : q)?.slice(0, 100) ?? ''}
    />
  );
}
