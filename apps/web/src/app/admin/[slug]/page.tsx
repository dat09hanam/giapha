import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { FilePenLine, Frame, Landmark, Palette, UsersRound } from 'lucide-react';

import { EditSuggestionsPanel } from '@/components/admin/edit-suggestions-panel';
import { FamilyAccountsPanel } from '@/components/admin/family-accounts-panel';
import { FamilyPosterForm } from '@/components/admin/family-poster-form';
import { FamilyProfileForm } from '@/components/admin/family-profile-form';
import { Button } from '@/components/ui/button';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { Tabs } from '@/components/ui/tabs';
import {
  getEditSuggestions,
  getFamily,
  getFamilyAccounts,
  getFamilyTree,
  getPosterDecorations,
} from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import type { FamilyAccount } from '@/lib/family-accounts-api';
import { requireFamilyManager, type FamilyManagerProfile } from '@/lib/family-manager';
import type { PosterDecoration } from '@/lib/poster-decorations';
import type { EditSuggestion } from '@/types/edit-suggestion';
import type { FamilyDetails, FamilyTreeResponse } from '@/types/family-tree';

type FamilyAdminPageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: 'Quản trị dòng họ',
  description: 'Không gian quản trị cây gia phả của dòng họ.',
};

export const dynamic = 'force-dynamic';

export default async function FamilyAdminPage({ params }: FamilyAdminPageProps) {
  const { slug } = await params;
  let profile: FamilyManagerProfile;
  let family: FamilyDetails;
  let decorations: PosterDecoration[];
  // The other tabs still work if only the suggestions fail to load.
  let suggestions: EditSuggestion[] | ApiRequestError;
  let accounts: FamilyAccount[];
  let tree: FamilyTreeResponse;
  try {
    profile = await requireFamilyManager(slug, 'admin');
    const sessionToken = (await cookies()).get('giapha_session')?.value ?? '';
    [family, decorations, suggestions, accounts, tree] = await Promise.all([
      getFamily(profile.family.slug),
      getPosterDecorations(sessionToken),
      getEditSuggestions(profile.family.slug, sessionToken).catch((error: unknown) => {
        if (error instanceof ApiRequestError) return error;
        throw error;
      }),
      getFamilyAccounts(profile.family.slug, sessionToken),
      // The clan head picks a branch root on the tree.
      getFamilyTree(profile.family.slug, sessionToken),
    ]);
  } catch (error: unknown) {
    if (error instanceof ApiRequestError) {
      return (
        <ApiErrorState
          title="Chưa thể tải thông tin dòng họ"
          message={error.message}
          retryHref={'/admin/' + encodeURIComponent(slug)}
        />
      );
    }
    throw error;
  }

  const pendingCount = Array.isArray(suggestions)
    ? suggestions.filter((suggestion) => suggestion.status === 'PENDING').length
    : 0;
  const familyPath = `/${encodeURIComponent(profile.family.slug)}`;
  return (
    <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      {/* The family's name is on the bottom bar's menu and the tree; this page keeps only its one shortcut. */}
      <h1 className="sr-only">Quản trị {family.name}</h1>
      <Tabs
        label="Khu vực quản trị dòng họ"
        actions={
          <Button asChild className="w-full lg:w-auto">
            <Link href={`${familyPath}/thiet_ke`}>
              <Palette className="size-4" aria-hidden="true" />
              Thiết kế gia phả
            </Link>
          </Button>
        }
        tabs={[
          {
            id: 'thong-tin',
            label: 'Thông tin dòng họ',
            shortLabel: 'Thông tin',
            icon: <Landmark aria-hidden="true" />,
            content: <FamilyProfileForm family={family} />,
          },
          {
            id: 'trang-tri',
            label: 'Trang trí phả đồ',
            shortLabel: 'Trang trí',
            icon: <Frame aria-hidden="true" />,
            content: <FamilyPosterForm family={family} decorations={decorations} />,
          },
          {
            id: 'tai-khoan',
            label: 'Tài khoản & phân chi',
            shortLabel: 'Tài khoản',
            icon: <UsersRound aria-hidden="true" />,
            content: (
              <FamilyAccountsPanel
                familySlug={profile.family.slug}
                initialAccounts={accounts}
                tree={tree}
              />
            ),
          },
          {
            id: 'de-xuat',
            label: 'Đề xuất chỉnh sửa',
            shortLabel: 'Đề xuất',
            badge: pendingCount,
            icon: <FilePenLine aria-hidden="true" />,
            content: Array.isArray(suggestions) ? (
              <EditSuggestionsPanel
                familySlug={profile.family.slug}
                initialSuggestions={suggestions}
              />
            ) : (
              <p
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
              >
                Chưa thể tải đề xuất chỉnh sửa: {suggestions.message} Hãy tải lại trang để thử lại.
              </p>
            ),
          },
        ]}
      />
    </main>
  );
}
