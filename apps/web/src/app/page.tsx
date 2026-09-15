import Link from 'next/link';
import { ArrowRight, Network, ShieldCheck, UsersRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: Network,
    title: 'Phả hệ trực quan',
    description: 'Khám phá các thế hệ và mối quan hệ trên một sơ đồ tương tác.',
  },
  {
    icon: UsersRound,
    title: 'Đa dòng họ',
    description: 'Mỗi dòng họ có không gian riêng tại một địa chỉ dễ nhớ.',
  },
  {
    icon: ShieldCheck,
    title: 'Tách biệt dữ liệu',
    description: 'Thông tin mỗi dòng họ được phân quyền riêng theo tài khoản.',
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid min-h-[620px] max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex rounded-full border border-emerald-900/15 bg-emerald-50/80 px-3 py-1 text-sm font-medium text-emerald-900">
            Nơi ký ức gia đình tiếp tục lớn lên
          </p>
          <h1 className="text-balance text-5xl font-semibold leading-[1.08] tracking-[-0.045em] text-emerald-950 sm:text-6xl lg:text-7xl">
            Gìn giữ cội nguồn, kết nối mai sau.
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-stone-600 sm:text-xl">
            Tạo không gian gia phả riêng cho dòng họ, lưu lại từng thế hệ và kể những câu chuyện
            đáng được truyền tiếp.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/register">
                Tạo gia phả
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Đăng nhập</Link>
            </Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-8 -z-10 rounded-full bg-emerald-800/10 blur-3xl" />
          <Card className="overflow-hidden border-emerald-950/10 bg-[#fffdf8]/90 shadow-2xl shadow-emerald-950/10">
            <CardHeader className="border-b bg-emerald-950 text-emerald-50">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-200">
                giapha.vn/demo
              </p>
              <CardTitle className="mt-2 text-2xl">Dòng họ Nguyễn Văn</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-6">
              <div className="mx-auto rounded-xl border bg-white px-5 py-3 text-center shadow-sm">
                <p className="font-semibold">Nguyễn Văn An</p>
                <p className="text-xs text-stone-500">Đời thứ nhất</p>
              </div>
              <div className="mx-auto h-7 w-px bg-emerald-800/35" />
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border bg-white px-4 py-3 text-center shadow-sm">
                  <p className="font-semibold">Nguyễn Văn Bình</p>
                  <p className="text-xs text-stone-500">Đời thứ hai</p>
                </div>
                <div className="rounded-xl border bg-white px-4 py-3 text-center shadow-sm">
                  <p className="font-semibold">Nguyễn Thị Minh</p>
                  <p className="text-xs text-stone-500">Đời thứ hai</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-y border-emerald-950/10 bg-white/45">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl p-5">
              <feature.icon className="size-6 text-emerald-800" aria-hidden="true" />
              <h2 className="mt-4 font-semibold text-emerald-950">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
