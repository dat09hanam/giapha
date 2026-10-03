import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Frame, Landmark, Network, Palette, ShieldCheck } from 'lucide-react';

import { AdminPageHeader } from '@/components/admin/admin-layout';
import { FamilyPosterForm } from '@/components/admin/family-poster-form';
import { FamilyProfileForm } from '@/components/admin/family-profile-form';
import { Button } from '@/components/ui/button';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { Tabs } from '@/components/ui/tabs';
import { getFamily, getPosterDecorations } from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import { requireFamilyManager, type FamilyManagerProfile } from '@/lib/family-manager';
import type { PosterDecoration } from '@/lib/poster-decorations';
import type { FamilyDetails } from '@/types/family-tree';

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
  try {
    profile = await requireFamilyManager(slug, 'admin');
    const sessionToken = (await cookies()).get('giapha_session')?.value ?? '';
    [family, decorations] = await Promise.all([
      getFamily(profile.family.slug),
      getPosterDecorations(sessionToken),
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

  const familyPath = `/${encodeURIComponent(profile.family.slug)}`;
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <AdminPageHeader
        eyebrow={
          <>
            <ShieldCheck aria-hidden="true" />
            Quản trị dòng họ
          </>
        }
        title={family.name}
        description={`Xin chào, ${profile.displayName}. Cập nhật thông tin giới thiệu và cách trình bày phả đồ của dòng họ.`}
        actions={
          <>
            <Button asChild>
              <Link href={familyPath}>
                <Network className="size-4" aria-hidden="true" />
                Xem cây gia phả
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`${familyPath}/thiet_ke`}>
                <Palette className="size-4" aria-hidden="true" />
                Thiết kế gia phả
              </Link>
            </Button>
          </>
        }
      />

      <Tabs
        label="Khu vực quản trị dòng họ"
        tabs={[
          {
            id: 'thong-tin',
            label: 'Thông tin dòng họ',
            icon: <Landmark aria-hidden="true" />,
            content: <FamilyProfileForm family={family} />,
          },
          {
            id: 'trang-tri',
            label: 'Trang trí phả đồ',
            icon: <Frame aria-hidden="true" />,
            content: <FamilyPosterForm family={family} decorations={decorations} />,
          },
        ]}
      />
    </main>
  );
}
