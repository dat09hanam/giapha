import type { Metadata } from 'next';
import Link from 'next/link';
import { Network, Palette, ShieldCheck, UsersRound } from 'lucide-react';

import { FamilyProfileForm } from '@/components/admin/family-profile-form';
import { LogoutButton } from '@/components/auth/logout-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getFamily } from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import { requireFamilyManager, type FamilyManagerProfile } from '@/lib/family-manager';
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
  try {
    profile = await requireFamilyManager(slug, 'admin');
    family = await getFamily(profile.family.slug);
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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <section className="rounded-3xl border border-emerald-950/10 bg-[#fffdf8]/85 p-6 shadow-xl shadow-emerald-950/5 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="gap-1.5 bg-emerald-900 text-white">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Quản trị dòng họ
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl">
              {family.name}
            </h1>
            <p className="mt-3 leading-7 text-stone-600">
              Xin chào, {profile.displayName}. Đây là không gian quản trị dành riêng cho trưởng họ.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/${encodeURIComponent(profile.family.slug)}`}>
                <Network className="size-4" aria-hidden="true" />
                Xem cây gia phả
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${encodeURIComponent(profile.family.slug)}/thiet_ke`}>
                <Palette className="size-4" aria-hidden="true" />
                Thiết kế gia phả
              </Link>
            </Button>
            <LogoutButton />
          </div>
        </div>
      </section>

      <section
        className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]"
        aria-label="Khu vực quản trị dòng họ"
      >
        <FamilyProfileForm family={family} />

        <div className="grid gap-5">
          <Card className="bg-white/75 shadow-sm">
            <CardHeader>
              <span className="grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-900">
                <UsersRound className="size-5" aria-hidden="true" />
              </span>
              <CardTitle className="mt-4">Thành viên và quan hệ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-stone-600">
                Quản lý thông tin thành viên và các mối quan hệ trong cây gia phả.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/75 shadow-sm">
            <CardHeader>
              <span className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-900">
                <Network className="size-5" aria-hidden="true" />
              </span>
              <CardTitle className="mt-4">Cây gia phả</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-stone-600">
                Xem lại cách các thế hệ đang được sắp xếp trên sơ đồ của dòng họ.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
