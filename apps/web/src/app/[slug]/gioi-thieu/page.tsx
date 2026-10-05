import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FamilyAbout } from '@/components/about/family-about';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { ApiNotFoundError, getFamily } from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import type { FamilyDetails } from '@/types/family-tree';

type FamilyAboutPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: FamilyAboutPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const family = await getFamily(slug);
    return { title: `Giới thiệu · ${family.name}`, description: family.description ?? undefined };
  } catch {
    return { title: 'Giới thiệu' };
  }
}

/** Giới thiệu reads the family's public profile, the same one its home page uses. */
export default async function FamilyAboutPage({ params }: FamilyAboutPageProps) {
  const { slug } = await params;
  const path = `/${encodeURIComponent(slug)}/gioi-thieu`;

  let family: FamilyDetails;
  try {
    family = await getFamily(slug);
  } catch (error: unknown) {
    if (error instanceof ApiNotFoundError) notFound();
    if (error instanceof ApiRequestError) {
      return (
        <ApiErrorState title="Chưa thể tải giới thiệu" message={error.message} retryHref={path} />
      );
    }
    throw error;
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)]">
      <FamilyAbout family={family} />
    </main>
  );
}
