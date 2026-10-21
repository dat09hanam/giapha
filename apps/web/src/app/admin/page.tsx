import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ClipboardList,
  LayoutDashboard,
  Contact,
  HandHeart,
  ImageIcon,
  Network,
  Newspaper,
  Sparkles,
  Tag,
} from 'lucide-react';

import { AdminOverview } from '@/components/admin/admin-overview';
import { AdminWorkspace } from '@/components/admin/admin-workspace';
import { AmbassadorsPanel } from '@/components/admin/ambassadors-panel';
import { ArticleManager } from '@/components/admin/article-manager';
import { CreateFamilyForm } from '@/components/admin/create-family-form';
import { DemoFamilyPanel } from '@/components/admin/demo-family-panel';
import { FamilyPlansPanel } from '@/components/admin/family-plans-panel';
import { PosterDecorationManager } from '@/components/admin/poster-decoration-manager';
import { PricingPlanManager } from '@/components/admin/pricing-plan-manager';
import { ServiceRegistrationsPanel } from '@/components/admin/service-registrations-panel';
import { SiteContactManager } from '@/components/admin/site-contact-manager';
import { ApiErrorState } from '@/components/ui/api-error-state';
import {
  ApiNotFoundError,
  ApiUnauthorizedError,
  getAdminArticles,
  getAdminFamilies,
  getAdminPricingPlans,
  getAmbassadorCommissions,
  getAmbassadors,
  getPlanCatalog,
  getAuthProfile,
  getDemoFamily,
  getFamily,
  getPosterDecorations,
  getServiceRegistrations,
  getSiteContact,
} from '@/lib/api';
import { buildAdminOverview } from '@/lib/admin-overview';
import { ApiRequestError } from '@/lib/api-error';
import { profileDestination, type AuthProfile } from '@/lib/auth-api';
import type { AdminFamily } from '@/lib/family-api';
import type { AdminPosterDecoration } from '@/lib/poster-decorations';
import { NO_INDEX } from '@/lib/seo';
import { SITE_BRAND } from '@/lib/site-brand';
import type { Ambassador, AmbassadorCommission } from '@/types/ambassador';
import type { AdminArticle } from '@/types/article';
import { requirePasswordChanged } from '@/lib/session';
import type { FamilyDetails } from '@/types/family-tree';
import type { PlanCatalogEntry, PricingPlan, ServiceRegistration } from '@/types/pricing';
import type { SiteContact } from '@/types/site-contact';

export const metadata: Metadata = {
  title: 'Quản trị',
  description: `Khu vực quản trị nền tảng ${SITE_BRAND.name}.`,
  robots: NO_INDEX,
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
  let contact: SiteContact;
  let ambassadors: Ambassador[];
  let commissions: AmbassadorCommission[];
  try {
    profile = await requireAdmin();
    const sessionToken = (await cookies()).get('giapha_session')?.value ?? '';
    [
      decorations,
      demoFamily,
      articles,
      pricingPlans,
      registrations,
      families,
      catalog,
      contact,
      ambassadors,
      commissions,
    ] = await Promise.all([
      getPosterDecorations<AdminPosterDecoration>(sessionToken),
      loadDemoFamily(),
      getAdminArticles(sessionToken),
      getAdminPricingPlans(sessionToken),
      getServiceRegistrations(sessionToken),
      getAdminFamilies(sessionToken),
      getPlanCatalog(),
      getSiteContact(),
      getAmbassadors(sessionToken),
      getAmbassadorCommissions(sessionToken),
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
          id: 'tong-quan',
          label: 'Tổng quan',
          icon: <LayoutDashboard aria-hidden="true" />,
          content: (
            <AdminOverview
              overview={buildAdminOverview({ families, registrations, ambassadors, commissions })}
            />
          ),
        },
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
          badge: registrations.filter((entry) => entry.seenAt === null).length,
          seenList: 'service-registrations',
          content: <ServiceRegistrationsPanel initial={registrations} />,
        },
        {
          id: 'dai-su',
          label: 'Đại sứ',
          icon: <HandHeart aria-hidden="true" />,
          badge: ambassadors.filter((entry) => entry.seenAt === null).length,
          seenList: 'ambassadors',
          content: (
            <AmbassadorsPanel initialAmbassadors={ambassadors} initialCommissions={commissions} />
          ),
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
        {
          id: 'lien-he',
          label: 'Liên hệ',
          icon: <Contact aria-hidden="true" />,
          content: <SiteContactManager initial={contact} />,
        },
      ]}
    />
  );
}
