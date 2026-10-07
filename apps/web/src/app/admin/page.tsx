import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ImageIcon, Network, ShieldCheck, Sparkles, ToggleRight } from 'lucide-react';

import { AdminPageHeader } from '@/components/admin/admin-layout';
import { CreateFamilyForm } from '@/components/admin/create-family-form';
import { DemoFamilyPanel } from '@/components/admin/demo-family-panel';
import { PlatformFeaturesForm } from '@/components/admin/platform-features-form';
import { PosterDecorationManager } from '@/components/admin/poster-decoration-manager';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { Tabs } from '@/components/ui/tabs';
import {
  ApiNotFoundError,
  ApiUnauthorizedError,
  getAuthProfile,
  getDemoFamily,
  getFamily,
  getPlatformFeatures,
  getPosterDecorations,
} from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import { profileDestination, type AuthProfile } from '@/lib/auth-api';
import type { AdminPosterDecoration } from '@/lib/poster-decorations';
import { requirePasswordChanged } from '@/lib/session';
import type { FamilyDetails, FamilyFeatures } from '@/types/family-tree';

export const metadata: Metadata = {
  description: 'Khu vực quản trị nền tảng Gia Phả Việt.',
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
  // A clan head who opens /admin wants their own family's admin pages, not its home page.
  if (profile.role === 'MEMBER_PLUS' && profile.family && !profile.mustChangePassword) {
    redirect(`/admin/${encodeURIComponent(profile.family.slug)}`);
  }
  if (profile.role !== 'ADMIN') redirect(profileDestination(profile));
  return profile;
}

/** The sample family's details, or null while none is marked. */
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
  let features: FamilyFeatures;
  let demoFamily: FamilyDetails | null;
  try {
    profile = await requireAdmin();
    const sessionToken = (await cookies()).get('giapha_session')?.value ?? '';
    [decorations, features, demoFamily] = await Promise.all([
      getPosterDecorations<AdminPosterDecoration>(sessionToken),
      getPlatformFeatures(),
      loadDemoFamily(),
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
    <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      <AdminPageHeader
        eyebrow={
          <>
            <ShieldCheck aria-hidden="true" />
            Quản trị hệ thống
          </>
        }
        title={`Xin chào, ${profile.displayName}`}
        description="Tạo không gian gia phả cho các dòng họ, chỉnh sửa gia phả mẫu, quản lý thư viện hình nền phả đồ dùng chung và bật tắt chức năng cho toàn hệ thống."
      />

      <Tabs
        label="Khu vực quản trị"
        tabs={[
          {
            id: 'dong-ho',
            label: 'Dòng họ',
            icon: <Network aria-hidden="true" />,
            content: <CreateFamilyForm />,
          },
          {
            id: 'gia-pha-mau',
            label: 'Gia phả mẫu',
            icon: <Sparkles aria-hidden="true" />,
            content: (
              <DemoFamilyPanel
                family={demoFamily}
                decorations={decorations.filter((decoration) => decoration.isActive)}
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
            id: 'chuc-nang',
            label: 'Chức năng',
            icon: <ToggleRight aria-hidden="true" />,
            content: <PlatformFeaturesForm initial={features} />,
          },
        ]}
      />
    </main>
  );
}
