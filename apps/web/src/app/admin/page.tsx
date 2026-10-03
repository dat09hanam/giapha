import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ImageIcon, Network, ShieldCheck } from 'lucide-react';

import { AdminPageHeader } from '@/components/admin/admin-layout';
import { CreateFamilyForm } from '@/components/admin/create-family-form';
import { PosterDecorationManager } from '@/components/admin/poster-decoration-manager';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { Tabs } from '@/components/ui/tabs';
import { ApiUnauthorizedError, getAuthProfile, getPosterDecorations } from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import { profileDestination, type AuthProfile } from '@/lib/auth-api';
import type { AdminPosterDecoration } from '@/lib/poster-decorations';

export const metadata: Metadata = {
  title: 'Quản trị hệ thống',
  description: 'Khu vực quản trị nền tảng Gia Phả Việt.',
};

export const dynamic = 'force-dynamic';

async function requireAdmin(): Promise<AuthProfile> {
  const sessionToken = (await cookies()).get('giapha_session')?.value;
  if (!sessionToken) redirect('/login?next=/admin');

  try {
    const profile = await getAuthProfile(sessionToken);
    if (profile.role !== 'ADMIN') redirect(profileDestination(profile));
    return profile;
  } catch (error) {
    if (error instanceof ApiUnauthorizedError) {
      redirect('/login?next=/admin&reason=session-expired');
    }
    throw error;
  }
}

export default async function AdminPage() {
  let profile: AuthProfile;
  let decorations: AdminPosterDecoration[];
  try {
    profile = await requireAdmin();
    const sessionToken = (await cookies()).get('giapha_session')?.value ?? '';
    decorations = await getPosterDecorations<AdminPosterDecoration>(sessionToken);
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
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <AdminPageHeader
        eyebrow={
          <>
            <ShieldCheck aria-hidden="true" />
            Quản trị hệ thống
          </>
        }
        title={`Xin chào, ${profile.displayName}`}
        description="Tạo không gian gia phả cho các dòng họ và quản lý thư viện hình nền phả đồ dùng chung."
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
            id: 'hinh-nen',
            label: 'Hình nền phả đồ',
            icon: <ImageIcon aria-hidden="true" />,
            content: <PosterDecorationManager initial={decorations} />,
          },
        ]}
      />
    </main>
  );
}
