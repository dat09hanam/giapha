import { ArticleListRoute, sectionMetadata } from '@/components/articles/article-routes';

export const metadata = sectionMetadata('LIBRARY');

export const dynamic = 'force-dynamic';

/** Thư viện: the published articles of this section. */
export default function ArticlesPage() {
  return <ArticleListRoute category="LIBRARY" />;
}
