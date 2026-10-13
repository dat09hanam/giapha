import { notFound } from 'next/navigation';

import { LibraryView } from '@/components/library/library-view';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { ApiNotFoundError, getFamilyPlanLimits, getFamilyTree, getLibrary } from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import { toFamilyStorage, type FamilyStorage } from '@/lib/family-storage';
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
  let storage: FamilyStorage | null;
  try {
    [library, people, storage] = await Promise.all([
      getLibrary(slug, sessionToken),
      profile.role === 'MEMBER_PLUS'
        ? getFamilyTree(slug, sessionToken).then((tree) => tree.people)
        : Promise.resolve([]),
      // The meter is a hint: the page still works if the usage cannot be loaded.
      profile.role === 'MEMBER_PLUS'
        ? getFamilyPlanLimits(slug, sessionToken).then(toFamilyStorage, () => null)
        : Promise.resolve(null),
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
      <LibraryView familySlug={slug} initial={library} people={people} storage={storage} />
    </main>
  );
}
