import { notFound } from 'next/navigation';

import { FamilyFeed } from '@/components/feed/family-feed';
import { ApiNotFoundError, getFamily, getFamilyFeatures } from '@/lib/api';
import { requireSession } from '@/lib/session';

type FamilyFeedPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export default async function FamilyFeedPage({ params }: FamilyFeedPageProps) {
  const { slug } = await params;
  const path = `/${encodeURIComponent(slug)}/bang-tin`;
  await requireSession(path);

  let feedOn = true;
  try {
    [, { feed: feedOn }] = await Promise.all([getFamily(slug), getFamilyFeatures(slug)]);
  } catch (error: unknown) {
    if (error instanceof ApiNotFoundError) notFound();
  }
  if (!feedOn) notFound();

  return (
    <main className="min-h-[calc(100dvh-4rem)]">
      <FamilyFeed familySlug={slug} />
    </main>
  );
}
