import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FamilyHome, type HomeSection } from '@/components/family-home/family-home';
import { ApiErrorState } from '@/components/ui/api-error-state';
import {
  ApiNotFoundError,
  getFamily,
  getFeedFirstPage,
  getFundLedger,
  getPlatformFeatures,
} from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import { requireSession } from '@/lib/session';
import type { FamilyDetails, FamilyFeatures } from '@/types/family-tree';

type FamilyHomePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: FamilyHomePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const family = await getFamily(slug);
    return { description: family.description ?? `Gia phả của ${family.name}` };
  } catch {
    return {};
  }
}

async function section<T>(on: boolean, load: () => Promise<T>): Promise<HomeSection<T>> {
  if (!on) return { state: 'off' };
  try {
    return { state: 'ok', data: await load() };
  } catch {
    return { state: 'error' };
  }
}

export default async function FamilyHomePage({ params }: FamilyHomePageProps) {
  const { slug } = await params;
  const path = `/${encodeURIComponent(slug)}`;
  const { sessionToken } = await requireSession(path);

  let family: FamilyDetails;
  try {
    family = await getFamily(slug);
  } catch (error: unknown) {
    if (error instanceof ApiNotFoundError) notFound();
    if (error instanceof ApiRequestError) {
      return (
        <ApiErrorState
          title="Chưa thể tải trang dòng họ"
          message={error.message}
          retryHref={path}
        />
      );
    }
    throw error;
  }

  const features: FamilyFeatures | null = await getPlatformFeatures().catch(() => null);
  const [fund, posts] = await Promise.all([
    section(features?.fund ?? true, async () => (await getFundLedger(slug, sessionToken)).totals),
    section(features?.feed ?? true, async () => (await getFeedFirstPage(slug, sessionToken)).posts),
  ]);

  return <FamilyHome slug={slug} family={family} features={features} fund={fund} posts={posts} />;
}
