import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ClipboardList, ImageIcon, Network, Newspaper, Sparkles, Tag } from 'lucide-react';

import { AdminWorkspace } from '@/components/admin/admin-workspace';
import { ArticleManager } from '@/components/admin/article-manager';
import { CreateFamilyForm } from '@/components/admin/create-family-form';
import { DemoFamilyPanel } from '@/components/admin/demo-family-panel';
import { FamilyPlansPanel } from '@/components/admin/family-plans-panel';
import { PosterDecorationManager } from '@/components/admin/poster-decoration-manager';
import { PricingPlanManager } from '@/components/admin/pricing-plan-manager';
import { ServiceRegistrationsPanel } from '@/components/admin/service-registrations-panel';
import { ApiErrorState } from '@/components/ui/api-error-state';
import {
  ApiNotFoundError,
  ApiUnauthorizedError,
  getAdminArticles,
  getAdminFamilies,
  getAdminPricingPlans,
  getPlanCatalog,
  getAuthProfile,
  getDemoFamily,
  getFamily,
  getPosterDecorations,
  getServiceRegistrations,
} from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import { profileDestination, type AuthProfile } from '@/lib/auth-api';
import type { AdminFamily } from '@/lib/family-api';
import type { AdminPosterDecoration } from '@/lib/poster-decorations';
import { SITE_BRAND } from '@/lib/site-brand';
import type { AdminArticle } from '@/types/article';
import { requirePasswordChanged } from '@/lib/session';
import type { FamilyDetails } from '@/types/family-tree';
import type { PlanCatalogEntry, PricingPlan, ServiceRegistration } from '@/types/pricing';

export const metadata: Metadata = {
  description: `Khu vực quản trị nền tảng ${SITE_BRAND.name}.`,
};

export const dynamic = 'force-dynamic';

async function requireAdmin(): Promise<AuthProfile> {
  const sessionToken = (await cookies()).get('giapha_session')?.value;
  if (!sessionToken) redirect('/login?next=/admin');

  let profile: AuthProfile;
  try {
    profile = await getAuthProfile(sessionToken);
  } catch (error) {
    if (error instanceof ApiUnauthorizedError) {
      redirect('/login?next=/admin&reason=session-expired');
    }
    throw error;
  }
  requirePasswordChanged(profile, '/admin');
  if (profile.role === 'MEMBER_PLUS' && profile.family && !profile.mustChangePassword) {
    redirect(`/admin/${encodeURIComponent(profile.family.slug)}`);
  }
  if (profile.role !== 'ADMIN') redirect(profileDestination(profile));
  return profile;
}

async function loadDemoFamily(): Promise<FamilyDetails | null> {
  try {
    return await getFamily((await getDemoFamily()).slug);
  } catch (error: unknown) {
    if (error instanceof ApiNotFoundError) return null;
    throw error;
  }
}

export default async function AdminPage() {
  let profile: AuthProfile;
  let decorations: AdminPosterDecoration[];
  let demoFamily: FamilyDetails | null;
  let articles: AdminArticle[];
  let pricingPlans: PricingPlan[];
  let registrations: ServiceRegistration[];
  let families: AdminFamily[];
  let catalog: PlanCatalogEntry[];
  try {
    profile = await requireAdmin();
    const sessionToken = (await cookies()).get('giapha_session')?.value ?? '';
    [decorations, demoFamily, articles, pricingPlans, registrations, families, catalog] =
      await Promise.all([
        getPosterDecorations<AdminPosterDecoration>(sessionToken),
        loadDemoFamily(),
        getAdminArticles(sessionToken),
        getAdminPricingPlans(sessionToken),
        getServiceRegistrations(sessionToken),
        getAdminFamilies(sessionToken),
        getPlanCatalog(),
      ]);
  } catch (error: unknown) {
    if (error instanceof ApiRequestError) {
      return (
        <ApiErrorState
          title="Chưa thể tải khu vực quản trị"
          message={error.message}
          retryHref="/admin"
        />
      );
    }
    throw error;
  }

  return (
    <AdminWorkspace
      displayName={profile.displayName}
      sections={[
        {
          id: 'dong-ho',
          label: 'Dòng họ',
          icon: <Network aria-hidden="true" />,
          content: (
            <div className="grid gap-6">
              <CreateFamilyForm plans={pricingPlans} />
              <FamilyPlansPanel families={families} plans={pricingPlans} />
            </div>
          ),
        },
        {
          id: 'dang-ky',
          label: 'Đăng ký dịch vụ',
          icon: <ClipboardList aria-hidden="true" />,
          badge: registrations.filter((entry) => entry.status === 'NEW').length,
          content: <ServiceRegistrationsPanel initial={registrations} />,
        },
        {
          id: 'bang-gia',
          label: 'Bảng giá',
          icon: <Tag aria-hidden="true" />,
          content: <PricingPlanManager initial={pricingPlans} catalog={catalog} />,
        },
        {
          id: 'gia-pha-mau',
          label: 'Gia phả mẫu',
          icon: <Sparkles aria-hidden="true" />,
          content: (
            <DemoFamilyPanel
              family={demoFamily}
              decorations={decorations.filter((decoration) => decoration.isActive)}
              plans={pricingPlans}
            />
          ),
        },
        {
          id: 'hinh-nen',
          label: 'Hình nền phả đồ',
          icon: <ImageIcon aria-hidden="true" />,
          content: <PosterDecorationManager initial={decorations} />,
        },
        {
          id: 'bai-viet',
          label: 'Bài viết',
          icon: <Newspaper aria-hidden="true" />,
          content: <ArticleManager initial={articles} />,
        },
      ]}
    />
  );
}
