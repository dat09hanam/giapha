import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AlbumView } from '@/components/library/album-view';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { ApiNotFoundError, getAlbum, getFamilyTree } from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import type { AlbumDetail } from '@/lib/library-api';
import { requireSession } from '@/lib/session';
import type { Person } from '@/types/family-tree';

type AlbumPageProps = {
  params: Promise<{ slug: string; albumId: string }>;
};

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Album ảnh' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { slug, albumId } = await params;
  if (!UUID.test(albumId)) notFound();
  const path = `/${encodeURIComponent(slug)}/tu-lieu/${albumId}`;
  const { sessionToken, profile } = await requireSession(path);

  let detail: AlbumDetail;
  let people: Person[];
  try {
    [detail, people] = await Promise.all([
      getAlbum(slug, albumId, sessionToken),
      // Only the clan head tags photos with people, so only they need the tree.
      profile.role === 'MEMBER_PLUS'
        ? getFamilyTree(slug, sessionToken).then((tree) => tree.people)
        : Promise.resolve([]),
    ]);
  } catch (error: unknown) {
    if (error instanceof ApiNotFoundError) notFound();
    if (error instanceof ApiRequestError) {
      return <ApiErrorState title="Chưa thể tải album" message={error.message} retryHref={path} />;
    }
    throw error;
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-stone-950">
      <AlbumView familySlug={slug} initial={detail} people={people} />
    </main>
  );
}
