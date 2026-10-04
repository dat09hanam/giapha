import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { PrintBookView } from '@/components/print/print-book-view';
import { ApiErrorState } from '@/components/ui/api-error-state';
import {
  ApiNotFoundError,
  ApiUnauthorizedError,
  getFamily,
  getFamilyTree,
  getPlatformFeatures,
} from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import type { FamilyDetails, FamilyTreeResponse } from '@/types/family-tree';

type PrintPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'In gia phả' };

async function loadBook(slug: string): Promise<{ tree: FamilyTreeResponse; family: FamilyDetails }> {
  const here = `/${slug}/in-gia-pha`;
  const sessionToken = (await cookies()).get('giapha_session')?.value;
  if (!sessionToken) {
    redirect(`/login?next=${encodeURIComponent(here)}`);
  }

  try {
    const [tree, family, features] = await Promise.all([
      getFamilyTree(slug, sessionToken),
      getFamily(slug),
      getPlatformFeatures(),
    ]);
    // The platform admin has switched printing off.
    if (!features.printBook) notFound();
    return { tree, family };
  } catch (error) {
    if (error instanceof ApiNotFoundError) notFound();
    if (error instanceof ApiUnauthorizedError) {
      redirect(`/login?next=${encodeURIComponent(here)}&reason=session-expired`);
    }
    throw error;
  }
}

export default async function PrintFamilyBookPage({ params }: PrintPageProps) {
  const { slug } = await params;
  let book: { tree: FamilyTreeResponse; family: FamilyDetails };
  try {
    book = await loadBook(slug);
  } catch (error: unknown) {
    if (error instanceof ApiRequestError) {
      return (
        <ApiErrorState
          title="Chưa thể chuẩn bị bản in"
          message={error.message}
          retryHref={`/${encodeURIComponent(slug)}/in-gia-pha`}
        />
      );
    }
    throw error;
  }

  if (book.tree.people.length === 0) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-6 text-center">
        <p className="text-lg font-medium text-stone-700">Cây gia phả chưa có ai để in</p>
      </main>
    );
  }

  return (
    <main>
      <PrintBookView tree={book.tree} family={book.family} familySlug={slug} />
    </main>
  );
}
