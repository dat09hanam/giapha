import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowUpRight,
  House,
  Network,
  Settings2,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';

import { LogoutButton } from '@/components/auth/logout-button';
import { CreateFamilyForm } from '@/components/admin/create-family-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiUnauthorizedError, getAuthProfile } from '@/lib/api';
import { profileDestination, type AuthProfile } from '@/lib/auth-api';

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
    if (error instanceof ApiUnauthorizedError) redirect('/login?next=/admin');
    throw error;
  }
}

const managementAreas = [
  {
    title: 'Quản lý dòng họ',
    description: 'Theo dõi các không gian gia phả được tạo trên hệ thống.',
    icon: Network,
  },
  {
    title: 'Quản lý tài khoản',
    description: 'Kiểm soát trạng thái và quyền truy cập của người dùng.',
    icon: UsersRound,
  },
  {
    title: 'Cấu hình hệ thống',
    description: 'Thiết lập các chính sách vận hành chung của nền tảng.',
    icon: Settings2,
  },
] as const;

export default async function AdminPage() {
  const profile = await requireAdmin();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="flex flex-col gap-6 rounded-3xl border border-emerald-950/10 bg-[#fffdf8]/80 p-6 shadow-xl shadow-emerald-950/5 backdrop-blur sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge className="gap-1.5 bg-emerald-900 text-white">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Quản trị hệ thống
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl">
            Xin chào, {profile.displayName}
          </h1>
          <p className="mt-3 max-w-2xl text-pretty leading-7 text-stone-600">
            Đây là không gian dành riêng cho Admin để quản lý hoạt động chung của Gia Phả Việt. Tài
            khoản Admin không thuộc bất kỳ dòng họ nào.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="ghost">
            <Link href="/">
              <House className="size-4" aria-hidden="true" />
              Trang chủ
            </Link>
          </Button>
          <LogoutButton />
        </div>
      </div>

      <section
        className="mt-7 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]"
        aria-label="Tổng quan quản trị"
      >
        <div>
          <CreateFamilyForm />
          <div className="mb-4 mt-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-emerald-800">Bảng điều khiển</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-emerald-950">
                Khu vực quản lý
              </h2>
            </div>
            <Badge variant="outline" className="bg-white/70">
              Đang xây dựng
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {managementAreas.map((area) => (
              <Card
                key={area.title}
                className="group bg-white/70 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardHeader>
                  <span className="grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-900">
                    <area.icon className="size-5" aria-hidden="true" />
                  </span>
                  <CardTitle className="mt-4 flex items-center justify-between gap-2 text-base leading-6">
                    {area.title}
                    <ArrowUpRight className="size-4 text-stone-400" aria-hidden="true" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-stone-600">{area.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="h-fit overflow-hidden border-emerald-900/15 bg-emerald-950 text-emerald-50 shadow-lg shadow-emerald-950/10">
          <CardHeader className="border-b border-white/10">
            <span className="grid size-11 place-items-center rounded-2xl bg-white/10 text-emerald-100">
              <UserRoundCheck className="size-5" aria-hidden="true" />
            </span>
            <CardTitle className="mt-4 text-xl">Phiên quản trị</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">
                Tài khoản
              </p>
              <p className="mt-1 break-all font-medium">{profile.username}</p>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4">
              <span className="text-sm text-emerald-100">Vai trò hiện tại</span>
              <Badge className="bg-emerald-100 text-emerald-950">ADMIN</Badge>
            </div>
            <p className="border-t border-white/10 pt-4 text-sm leading-6 text-emerald-100/80">
              Phiên đăng nhập được bảo vệ bằng cookie HttpOnly và được xác thực lại khi mở trang
              này.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
