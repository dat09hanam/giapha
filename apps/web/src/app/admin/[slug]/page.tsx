import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Network, ShieldCheck, UsersRound } from 'lucide-react';

import { LogoutButton } from '@/components/auth/logout-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiUnauthorizedError, getAuthProfile } from '@/lib/api';
import { profileDestination, type AuthProfile } from '@/lib/auth-api';

type FamilyAdminPageProps = {
  params: Promise<{ slug: string }>;
};

type FamilyManagerProfile = AuthProfile & {
  role: 'MEMBER_PLUS';
  family: NonNullable<AuthProfile['family']>;
};

export const metadata: Metadata = {
  title: 'Quản trị dòng họ',
  description: 'Không gian quản trị cây gia phả của dòng họ.',
};

export const dynamic = 'force-dynamic';

async function requireFamilyManager(slug: string): Promise<FamilyManagerProfile> {
  const sessionToken = (await cookies()).get('giapha_session')?.value;
  if (!sessionToken) redirect('/login');

  let profile: AuthProfile;
  try {
    profile = await getAuthProfile(sessionToken);
  } catch (error) {
    if (error instanceof ApiUnauthorizedError) redirect('/login');
    throw error;
  }

  if (profile.role !== 'MEMBER_PLUS') {
    redirect(profileDestination(profile));
  }

  if (!profile.family) {
    redirect('/');
  }

  if (slug !== profile.family.slug) {
    redirect(`/admin/${encodeURIComponent(profile.family.slug)}`);
  }

  return { ...profile, role: profile.role, family: profile.family };
}

export default async function FamilyAdminPage({ params }: FamilyAdminPageProps) {
  const { slug } = await params;
  const profile = await requireFamilyManager(slug);

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
              {profile.family.name}
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
            <LogoutButton />
          </div>
        </div>
      </section>

      <section className="mt-7 grid gap-5 md:grid-cols-2" aria-label="Khu vực quản trị dòng họ">
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
      </section>
    </main>
  );
}
