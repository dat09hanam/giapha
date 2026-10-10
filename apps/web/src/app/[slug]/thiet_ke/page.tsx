import type { Metadata } from 'next';

import { FamilyTreeDesigner } from '@/components/tree/family-tree-designer';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { getEditSuggestions, getFamilyTree, getTreeEditScope } from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import { requireFamilyManager } from '@/lib/family-manager';
import type { EditSuggestion } from '@/types/edit-suggestion';

type FamilyDesignerPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ person?: string | string[]; suggestion?: string | string[] }>;
};

export const metadata: Metadata = {
  description: 'Không gian thiết kế cấu trúc cây gia phả theo từng thế hệ.',
};

export const dynamic = 'force-dynamic';

function single(value: string | string[] | undefined): string | null {
  return typeof value === 'string' && value ? value : null;
}

export default async function FamilyDesignerPage({
  params,
  searchParams,
}: FamilyDesignerPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const personId = single(query.person);
  const suggestionId = single(query.suggestion);

  try {
    const profile = await requireFamilyManager(slug, 'designer');
    const [tree, editScope, suggestions] = await Promise.all([
      getFamilyTree(profile.family.slug, profile.sessionToken),
      getTreeEditScope(profile.family.slug, profile.sessionToken),
      suggestionId && profile.role === 'MEMBER_PLUS'
        ? getEditSuggestions(profile.family.slug, profile.sessionToken).catch(() => null)
        : null,
    ]);
    const suggestion: EditSuggestion | null =
      suggestions?.find((entry) => entry.id === suggestionId) ?? null;
    const focusPersonId = personId ?? suggestion?.person.id ?? null;

    return (
      <FamilyTreeDesigner
        familyName={profile.family.name}
        familySlug={profile.family.slug}
        initialTree={tree}
        editScope={editScope}
        focus={focusPersonId ? { personId: focusPersonId, suggestion } : null}
      />
    );
  } catch (error: unknown) {
    if (error instanceof ApiRequestError) {
      return (
        <ApiErrorState
          title="Chưa thể mở trang thiết kế"
          message={error.message}
          retryHref={'/' + encodeURIComponent(slug) + '/thiet_ke'}
        />
      );
    }
    throw error;
  }
}
