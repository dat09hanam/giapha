import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MeritEventView } from '@/components/merit/merit-event-view';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { ApiNotFoundError, getMeritEvent } from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import type { MeritEventDetail } from '@/lib/merit-api';
import { requireSession } from '@/lib/session';

type MeritEventPageProps = {
  params: Promise<{ slug: string; eventId: string }>;
};

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Sự kiện công đức' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MeritEventPage({ params }: MeritEventPageProps) {
  const { slug, eventId } = await params;
  if (!UUID.test(eventId)) notFound();
  const path = `/${encodeURIComponent(slug)}/cong-duc/${eventId}`;
  const { sessionToken } = await requireSession(path);

  let detail: MeritEventDetail;
  try {
    detail = await getMeritEvent(slug, eventId, sessionToken);
  } catch (error: unknown) {
    if (error instanceof ApiNotFoundError) notFound();
    if (error instanceof ApiRequestError) {
      return (
        <ApiErrorState
          title="Chưa thể tải sự kiện công đức"
          message={error.message}
          retryHref={path}
        />
      );
    }
    throw error;
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-stone-100">
      <MeritEventView familySlug={slug} initial={detail} />
    </main>
  );
}
