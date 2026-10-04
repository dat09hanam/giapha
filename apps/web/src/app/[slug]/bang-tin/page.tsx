import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FamilyFeed } from '@/components/feed/family-feed';
import { ApiNotFoundError, getFamily } from '@/lib/api';
import { requireSession } from '@/lib/session';

type FamilyFeedPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: FamilyFeedPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const family = await getFamily(slug);
    return { title: `Bảng tin · ${family.name}` };
  } catch {
    return { title: 'Bảng tin' };
  }
}

export default async function FamilyFeedPage({ params }: FamilyFeedPageProps) {
  const { slug } = await params;
  const path = `/${encodeURIComponent(slug)}/bang-tin`;
  // The feed loads in the browser, so check the session here: a reload with an expired
  // one goes straight to sign in instead of showing an error in an empty feed.
  await requireSession(path);

  try {
    await getFamily(slug);
  } catch (error: unknown) {
    if (error instanceof ApiNotFoundError) notFound();
    // Other failures surface in the feed itself, which can retry.
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-stone-100">
      <FamilyFeed familySlug={slug} />
    </main>
  );
}
