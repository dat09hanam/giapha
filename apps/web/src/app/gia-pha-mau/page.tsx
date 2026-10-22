import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, LogIn, Sprout } from 'lucide-react';

import { FamilyTree } from '@/components/tree/family-tree';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { Button } from '@/components/ui/button';
import { ApiNotFoundError, getDemoFamily, getDemoFamilyTree, getFamily } from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import { pageMetadata } from '@/lib/seo';
import type { FamilyDetails, FamilyFeatures, FamilyTreeResponse } from '@/types/family-tree';

export const metadata: Metadata = pageMetadata({
  title: 'Gia phả mẫu',
  description:
    'Xem thử cây gia phả mẫu trên Gia Phả Đời Đời: phả đồ nhiều đời, quan hệ cha mẹ, vợ chồng, con cháu và thông tin từng thành viên, không cần đăng nhập.',
  path: '/gia-pha-mau',
});

export const dynamic = 'force-dynamic';

const VISITOR_FEATURES: FamilyFeatures = {
  feed: false,
  fund: false,
  merit: false,
  library: false,
  editSuggestions: false,
  printBook: false,
};

function NoDemoYet() {
  return (
    <main className="mx-auto grid min-h-[70vh] w-full max-w-2xl place-items-center px-4 py-12">
      <section className="heritage-panel w-full rounded-2xl p-6 text-center sm:p-10">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-gold-100 text-brand-700">
          <Sprout className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold text-brand-800">
          Gia phả mẫu đang được chuẩn bị
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-stone-600">
          Hiện chưa có gia phả mẫu để xem thử. Bạn có thể quay lại sau, hoặc đăng nhập nếu dòng họ
          của bạn đã có tài khoản.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Về trang chủ
            </Link>
          </Button>
          <Button asChild>
            <Link href="/login">
              <LogIn className="size-4" aria-hidden="true" />
              Đăng nhập
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

export default async function DemoFamilyPage() {
  let tree: FamilyTreeResponse;
  let family: FamilyDetails;
  try {
    const demo = await getDemoFamily();
    [tree, family] = await Promise.all([getDemoFamilyTree(), getFamily(demo.slug)]);
  } catch (error: unknown) {
    if (error instanceof ApiNotFoundError) return <NoDemoYet />;
    if (error instanceof ApiRequestError) {
      return (
        <ApiErrorState
          title="Chưa thể tải gia phả mẫu"
          error={error}
          retryHref="/gia-pha-mau"
        />
      );
    }
    throw error;
  }

  if (tree.people.length === 0) return <NoDemoYet />;

  return (
    <main className="overflow-hidden">
      <h1 className="sr-only">Gia phả mẫu – {family.name}</h1>
      <FamilyTree
        tree={tree}
        family={{ name: family.name, poster: family.poster, features: VISITOR_FEATURES }}
        familySlug={family.slug}
        showToolbar={false}
      />
    </main>
  );
}
