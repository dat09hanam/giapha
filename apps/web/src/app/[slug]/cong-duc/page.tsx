import { notFound } from 'next/navigation';

import { MeritEvents } from '@/components/merit/merit-events';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { ApiNotFoundError, getMeritOverview } from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import type { MeritOverview } from '@/lib/merit-api';
import { requireSession } from '@/lib/session';

type MeritPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export default async function MeritPage({ params }: MeritPageProps) {
  const { slug } = await params;
  const path = `/${encodeURIComponent(slug)}/cong-duc`;
  const { sessionToken } = await requireSession(path);

  let overview: MeritOverview;
  try {
    overview = await getMeritOverview(slug, sessionToken);
  } catch (error: unknown) {
    if (error instanceof ApiNotFoundError) notFound();
    if (error instanceof ApiRequestError) {
      return (
        <ApiErrorState title="Chưa thể tải công đức" message={error.message} retryHref={path} />
      );
    }
    throw error;
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)]">
      <MeritEvents familySlug={slug} initial={overview} />
    </main>
  );
}
