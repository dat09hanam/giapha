import { notFound } from 'next/navigation';

import { LibraryView } from '@/components/library/library-view';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { ApiNotFoundError, getFamilyTree, getLibrary } from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import type { LibraryOverview } from '@/lib/library-api';
import { requireSession } from '@/lib/session';
import type { Person } from '@/types/family-tree';

type FamilyLibraryPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export default async function FamilyLibraryPage({ params }: FamilyLibraryPageProps) {
  const { slug } = await params;
  const path = `/${encodeURIComponent(slug)}/tu-lieu`;
  const { sessionToken, profile } = await requireSession(path);

  let library: LibraryOverview;
  let people: Person[];
  try {
    [library, people] = await Promise.all([
      getLibrary(slug, sessionToken),
      // Only the clan head tags documents with people, so only they need the tree.
      profile.role === 'MEMBER_PLUS'
        ? getFamilyTree(slug, sessionToken).then((tree) => tree.people)
        : Promise.resolve([]),
    ]);
  } catch (error: unknown) {
    if (error instanceof ApiNotFoundError) notFound();
    if (error instanceof ApiRequestError) {
      return (
        <ApiErrorState
          title="Chưa thể tải album và tư liệu"
          message={error.message}
          retryHref={path}
        />
      );
    }
    throw error;
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)]">
      <LibraryView familySlug={slug} initial={library} people={people} />
    </main>
  );
}
