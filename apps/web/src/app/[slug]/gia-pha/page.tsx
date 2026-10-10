import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { FamilyTree } from '@/components/tree/family-tree';
import { ApiErrorState } from '@/components/ui/api-error-state';
import {
  ApiNotFoundError,
  ApiUnauthorizedError,
  getAuthProfile,
  getFamilyTree,
  getFamily,
  getFamilyFeatures,
} from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import { isClanHeadOf } from '@/lib/auth-api';
import type { FamilyDetails, FamilyFeatures, FamilyTreeResponse } from '@/types/family-tree';

type FamilyPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: FamilyPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const family = await getFamily(slug);
    return { description: family.description ?? `Gia phả của ${family.name}` };
  } catch {
    return {};
  }
}

async function loadFamilyTree(
  slug: string,
): Promise<{ tree: FamilyTreeResponse; isClanHead: boolean }> {
  const sessionToken = (await cookies()).get('giapha_session')?.value;
  if (!sessionToken) {
    redirect(`/login?next=${encodeURIComponent(`/${slug}/gia-pha`)}`);
  }

  try {
    const [tree, profile] = await Promise.all([
      getFamilyTree(slug, sessionToken),
      getAuthProfile(sessionToken),
    ]);
    return { tree, isClanHead: isClanHeadOf(profile, slug) };
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      notFound();
    }

    if (error instanceof ApiUnauthorizedError) {
      redirect(
        '/login?next=' + encodeURIComponent('/' + slug + '/gia-pha') + '&reason=session-expired',
      );
    }

    throw error;
  }
}

export default async function FamilyPage({ params }: FamilyPageProps) {
  const { slug } = await params;
  let tree: FamilyTreeResponse;
  let family: FamilyDetails;
  let features: FamilyFeatures;
  try {
    const loaded = await loadFamilyTree(slug);
    tree = loaded.tree;
    let familyFeatures: FamilyFeatures;
    [family, familyFeatures] = await Promise.all([getFamily(slug), getFamilyFeatures(slug)]);
    features = { ...familyFeatures, printBook: familyFeatures.printBook && loaded.isClanHead };
  } catch (error: unknown) {
    if (error instanceof ApiRequestError) {
      return (
        <ApiErrorState
          title="Chưa thể tải cây gia phả"
          message={error.message}
          retryHref={'/' + encodeURIComponent(slug) + '/gia-pha'}
        />
      );
    }
    throw error;
  }

  if (tree.people.length === 0) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-6 text-center">
        <p className="text-lg font-medium text-stone-700">Cây gia phả đang được thiết kế</p>
      </main>
    );
  }

  return (
    <main className="overflow-hidden">
      <FamilyTree
        tree={tree}
        family={{ name: family.name, poster: family.poster, features }}
        familySlug={slug}
      />
    </main>
  );
}
