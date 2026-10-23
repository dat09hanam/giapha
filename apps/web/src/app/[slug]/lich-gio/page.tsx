import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { AnniversaryCalendarView } from '@/components/anniversaries/anniversary-calendar';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { ApiNotFoundError, ApiUnauthorizedError, getAnniversaryCalendar } from '@/lib/api';
import type { AnniversaryCalendar } from '@/lib/anniversary-api';
import { ApiRequestError } from '@/lib/api-error';
import { NO_INDEX } from '@/lib/seo';

type AnniversaryPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Lịch giỗ', robots: NO_INDEX };

export default async function AnniversaryPage({ params }: AnniversaryPageProps) {
  const { slug } = await params;
  const path = `/${encodeURIComponent(slug)}/lich-gio`;
  const sessionToken = (await cookies()).get('giapha_session')?.value;
  if (!sessionToken) redirect(`/login?next=${encodeURIComponent(path)}`);

  let calendar: AnniversaryCalendar;
  try {
    calendar = await getAnniversaryCalendar(slug, sessionToken);
  } catch (error: unknown) {
    if (error instanceof ApiNotFoundError) notFound();
    if (error instanceof ApiUnauthorizedError) {
      redirect(`/login?next=${encodeURIComponent(path)}&reason=session-expired`);
    }
    if (error instanceof ApiRequestError) {
      return <ApiErrorState title="Chưa thể tải lịch giỗ" error={error} retryHref={path} />;
    }
    throw error;
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)]">
      <AnniversaryCalendarView familySlug={slug} initial={calendar} />
    </main>
  );
}
