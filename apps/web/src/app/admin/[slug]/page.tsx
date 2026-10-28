import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { EditSuggestionsPanel } from '@/components/admin/edit-suggestions-panel';
import { FamilyAccountsPanel } from '@/components/admin/family-accounts-panel';
import { FamilyImportPanel } from '@/components/admin/family-import-panel';
import { FamilyPlanPanel } from '@/components/admin/family-plan-panel';
import { GoogleAccountCard } from '@/components/admin/google-account-card';
import { FamilyPosterForm } from '@/components/admin/family-poster-form';
import { FamilyProfileForm } from '@/components/admin/family-profile-form';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import {
  getEditSuggestions,
  getFamily,
  getFamilyAccounts,
  getFamilyFeatures,
  getFamilyPlanOverview,
  getFamilyTree,
  getFamilyUsernameSuffix,
  getPosterDecorations,
  getPricingPlans,
} from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import { familyAdminSection, type FamilyAdminSectionId } from '@/lib/family-admin-sections';
import type { FamilyAccount } from '@/lib/family-accounts-api';
import { requireFamilyManager, type FamilyManagerProfile } from '@/lib/family-manager';
import type { PosterDecoration } from '@/lib/poster-decorations';
import { NO_INDEX } from '@/lib/seo';
import type { EditSuggestion } from '@/types/edit-suggestion';
import type { FamilyPlanOverview } from '@/types/family-plan';
import type { FamilyDetails, FamilyFeatures, FamilyTreeResponse } from '@/types/family-tree';
import type { PricingPlan } from '@/types/pricing';

type FamilyAdminPageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: 'Quản trị dòng họ',
  description: 'Không gian quản trị cây gia phả của dòng họ.',
  robots: NO_INDEX,
};

export const dynamic = 'force-dynamic';

/**
 * A family whose plan ran out can reach nothing but its plan, so its clan head gets the plan tab
 * alone, to renew or upgrade.
 */
async function loadExpiredPlanView(
  profile: FamilyManagerProfile,
): Promise<{ overview: FamilyPlanOverview; plans: PricingPlan[] } | null> {
  if (profile.isPlatformAdmin) return null;
  const sessionToken = (await cookies()).get('giapha_session')?.value ?? '';
  try {
    const [overview, plans] = await Promise.all([
      getFamilyPlanOverview(profile.family.slug, sessionToken),
      getPricingPlans(),
    ]);
    return overview.expired ? { overview, plans } : null;
  } catch {
    return null;
  }
}

function adminTab(id: FamilyAdminSectionId): Pick<TabItem, 'id' | 'label' | 'shortLabel' | 'icon'> {
  const { label, shortLabel, icon: Icon } = familyAdminSection(id);
  return { id, label, shortLabel, icon: <Icon aria-hidden="true" /> };
}

export default async function FamilyAdminPage({ params }: FamilyAdminPageProps) {
  const { slug } = await params;
  let profile: FamilyManagerProfile;
  let family: FamilyDetails;
  let decorations: PosterDecoration[];
  let suggestions: EditSuggestion[] | ApiRequestError;
  let accounts: FamilyAccount[];
  let usernameSuffix: string;
  let tree: FamilyTreeResponse;
  let features: FamilyFeatures | null;
  let planView: { overview: FamilyPlanOverview; plans: PricingPlan[] } | null;
  let signedIn: FamilyManagerProfile | null = null;
  try {
    profile = await requireFamilyManager(slug, 'admin');
    signedIn = profile;
    const sessionToken = (await cookies()).get('giapha_session')?.value ?? '';
    let suffix: { suffix: string };
    [family, decorations, suggestions, accounts, tree, suffix, features, planView] =
      await Promise.all([
        getFamily(profile.family.slug),
        getPosterDecorations(sessionToken),
        getEditSuggestions(profile.family.slug, sessionToken).catch((error: unknown) => {
          if (error instanceof ApiRequestError) return error;
          throw error;
        }),
        getFamilyAccounts(profile.family.slug, sessionToken),
        getFamilyTree(profile.family.slug, sessionToken),
        getFamilyUsernameSuffix(profile.family.slug, sessionToken),
        getFamilyFeatures(profile.family.slug).catch(() => null),
        // The sample family is the platform's own and has no plan to upgrade.
        profile.isPlatformAdmin
          ? null
          : Promise.all([
              getFamilyPlanOverview(profile.family.slug, sessionToken),
              getPricingPlans(),
            ]).then(([overview, plans]) => ({ overview, plans })),
      ]);
    usernameSuffix = suffix.suffix;
  } catch (error: unknown) {
    const expiredView =
      error instanceof ApiRequestError && error.status === 403 && signedIn
        ? await loadExpiredPlanView(signedIn)
        : null;
    if (expiredView && signedIn) {
      return (
        <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
          <h1 className="sr-only">Gói dịch vụ đã hết hạn</h1>
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm leading-6 text-red-800"
          >
            Gói dịch vụ của dòng họ đã hết hạn nên tạm thời chưa dùng được các chức năng quản trị.
            Hãy gia hạn hoặc nâng cấp gói bên dưới; mọi dữ liệu của dòng họ vẫn được giữ nguyên và
            mở lại ngay khi gói được gia hạn.
          </p>
          <FamilyPlanPanel
            familySlug={signedIn.family.slug}
            overview={expiredView.overview}
            plans={expiredView.plans}
            defaultName={signedIn.displayName}
            defaultEmail={signedIn.email ?? ''}
          />
        </main>
      );
    }
    if (error instanceof ApiRequestError) {
      return (
        <ApiErrorState
          title="Chưa thể tải thông tin dòng họ"
          error={error}
          retryHref={'/admin/' + encodeURIComponent(slug)}
        />
      );
    }
    throw error;
  }

  const pendingCount = Array.isArray(suggestions)
    ? suggestions.filter((suggestion) => suggestion.status === 'PENDING').length
    : 0;
  const suggestionsOn = features?.editSuggestions ?? true;
  return (
    <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      <h1 className="sr-only">Quản trị {family.name}</h1>
      <Tabs
        label="Khu vực quản trị dòng họ"
        menuTitle="Quản lý dòng họ"
        tabs={[
          {
            ...adminTab('thong-tin'),
            content: <FamilyProfileForm family={family} />,
          },
          {
            ...adminTab('trang-tri'),
            content: <FamilyPosterForm family={family} decorations={decorations} />,
          },
          {
            ...adminTab('tai-khoan'),
            content: (
              <div className="grid grid-cols-1 gap-6">
                {profile.isPlatformAdmin ? null : (
                  <GoogleAccountCard
                    initialEmail={profile.email}
                    initialLinked={profile.googleLinked}
                  />
                )}
                <FamilyAccountsPanel
                  familySlug={profile.family.slug}
                  initialAccounts={accounts}
                  usernameSuffix={usernameSuffix}
                  tree={tree}
                />
              </div>
            ),
          },
          planView !== null && {
            ...adminTab('goi-dich-vu'),
            content: (
              <FamilyPlanPanel
                familySlug={profile.family.slug}
                overview={planView.overview}
                plans={planView.plans}
                defaultName={profile.displayName}
                defaultEmail={profile.email ?? ''}
              />
            ),
          },
          {
            ...adminTab('nhap-excel'),
            content: (
              <FamilyImportPanel
                familySlug={profile.family.slug}
                memberCount={tree.people.length}
              />
            ),
          },
          suggestionsOn && {
            ...adminTab('de-xuat'),
            badge: pendingCount,
            content: Array.isArray(suggestions) ? (
              <EditSuggestionsPanel
                familySlug={profile.family.slug}
                initialSuggestions={suggestions}
              />
            ) : (
              <p
                role="status"
                className="rounded-2xl border border-gold-200 bg-gold-50 px-5 py-4 text-sm leading-6 text-wood-700"
              >
                {suggestions.message}
              </p>
            ),
          },
        ].filter((tab) => tab !== false)}
      />
    </main>
  );
}
