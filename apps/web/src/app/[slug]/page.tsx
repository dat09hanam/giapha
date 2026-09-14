import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, GitFork, UsersRound } from 'lucide-react';

import { FamilyTree } from '@/components/tree/family-tree';
import { Badge } from '@/components/ui/badge';
import { ApiNotFoundError, getFamilyTree, getTenant } from '@/lib/api';

type TenantPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: TenantPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const tenant = await getTenant(slug);
    return {
      title: tenant.name,
      description: tenant.description ?? `Gia phả của ${tenant.name}`,
    };
  } catch {
    return { title: 'Không tìm thấy gia phả' };
  }
}

async function loadFamilyTree(slug: string) {
  try {
    return await getFamilyTree(slug);
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      notFound();
    }

    throw error;
  }
}

export default async function TenantPage({ params }: TenantPageProps) {
  const { slug } = await params;
  const tree = await loadFamilyTree(slug);

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 transition hover:text-emerald-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Trang chủ
      </Link>

      <div className="mt-5 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <Badge variant="secondary">giapha.vn/{tree.tenant.slug}</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl">
            {tree.family.name}
          </h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            {tree.family.description ?? tree.tenant.description ?? 'Cây gia phả của dòng họ.'}
          </p>
        </div>
        <div className="flex gap-2 text-sm text-stone-600">
          <Badge variant="outline" className="gap-1.5 bg-white/65">
            <UsersRound className="size-3.5" aria-hidden="true" />
            {tree.people.length} thành viên
          </Badge>
          <Badge variant="outline" className="gap-1.5 bg-white/65">
            <GitFork className="size-3.5" aria-hidden="true" />
            {tree.parentChildRelationships.length} liên kết
          </Badge>
        </div>
      </div>

      <div className="mt-7 overflow-hidden rounded-3xl border border-emerald-950/10 bg-[#fffdf8]/75 shadow-xl shadow-emerald-950/5">
        <FamilyTree tree={tree} />
      </div>
    </main>
  );
}
