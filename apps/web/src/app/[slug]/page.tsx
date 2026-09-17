import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { FamilyTree } from '@/components/tree/family-tree';
import { ApiNotFoundError, ApiUnauthorizedError, getFamilyTree, getFamily } from '@/lib/api';

type FamilyPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: FamilyPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const family = await getFamily(slug);
    return {
      title: family.name,
      description: family.description ?? `Gia phả của ${family.name}`,
    };
  } catch {
    return { title: 'Không tìm thấy gia phả' };
  }
}

async function loadFamilyTree(slug: string) {
  const sessionToken = (await cookies()).get('giapha_session')?.value;
  if (!sessionToken) {
    redirect(`/login?next=${encodeURIComponent(`/${slug}`)}`);
  }

  try {
    return await getFamilyTree(slug, sessionToken);
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      notFound();
    }

    if (error instanceof ApiUnauthorizedError) {
      redirect(`/login?next=${encodeURIComponent(`/${slug}`)}`);
    }

    throw error;
  }
}

export default async function FamilyPage({ params }: FamilyPageProps) {
  const { slug } = await params;
  const tree = await loadFamilyTree(slug);

  if (tree.people.length === 0) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-6 text-center">
        <p className="text-lg font-medium text-stone-700">Cây gia phả đang được thiết kế</p>
      </main>
    );
  }

  return (
    <main className="overflow-hidden">
      <FamilyTree tree={tree} />
    </main>
  );
}
