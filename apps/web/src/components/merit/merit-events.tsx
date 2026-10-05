'use client';

import { CalendarDays, ChevronRight, HandHeart, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { MeritEventDialog } from '@/components/merit/merit-event-dialog';
import { Button } from '@/components/ui/button';
import { Presence } from '@/components/ui/presence';
import type { MeritOverview, MeritTotals } from '@/lib/merit-api';
import { formatVnd } from '@/lib/vietnamese-number';
import { formatDay } from '@/lib/vietnam-date';

/** "12.500.000 ₫ · 3 hiện vật", leaving out what the event has none of. */
export function meritTotalsLine(totals: MeritTotals): string {
  const parts: string[] = [];
  if (totals.cashCount > 0) parts.push(formatVnd(totals.cashAmount));
  if (totals.itemCount > 0) parts.push(`${totals.itemCount} hiện vật`);
  return parts.length > 0 ? parts.join(' · ') : 'Chưa có lượt công đức';
}

/** Công đức: the family's events, each opening onto its donors. */
export function MeritEvents({
  familySlug,
  initial,
}: {
  familySlug: string;
  initial: MeritOverview;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const { events, canManage } = initial;
  const href = (eventId: string): string =>
    `/${encodeURIComponent(familySlug)}/cong-duc/${eventId}`;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-2 pb-6 sm:gap-4 sm:px-4 sm:py-6">
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-800 to-red-900 px-5 py-6 text-white shadow-sm sm:rounded-2xl">
        <HandHeart
          className="pointer-events-none absolute -right-4 -top-4 size-32 text-white/10"
          aria-hidden="true"
        />
        <h1 className="text-2xl font-bold tracking-tight">Công đức</h1>
        <p className="mt-1 max-w-md text-sm leading-6 text-amber-50/90">
          Ghi nhận tấm lòng của con cháu và quan khách đóng góp tiền mặt hoặc hiện vật cho các sự
          kiện của dòng họ.
        </p>
        {canManage ? (
          <Button
            type="button"
            variant="outline"
            className="mt-4 border-white/20 bg-white text-red-900 hover:bg-amber-50"
            onClick={() => setCreating(true)}
          >
            <Plus className="size-4" aria-hidden="true" />
            Tạo sự kiện
          </Button>
        ) : null}
      </section>

      {events.length === 0 ? (
        <div className="grid justify-items-center gap-2 bg-white px-6 py-12 text-center text-sm text-stone-500 shadow-sm sm:rounded-2xl sm:border sm:border-stone-200">
          <span className="grid size-12 place-items-center rounded-full bg-amber-50 text-amber-700">
            <HandHeart className="size-6" aria-hidden="true" />
          </span>
          {canManage
            ? 'Chưa có sự kiện nào. Hãy tạo sự kiện đầu tiên để ghi công đức.'
            : 'Dòng họ chưa có sự kiện công đức nào.'}
        </div>
      ) : (
        <ul
          aria-label="Sự kiện công đức"
          className="divide-y divide-stone-100 bg-white shadow-sm sm:rounded-2xl sm:border sm:border-stone-200"
        >
          {events.map((event) => {
            const count = event.totals.cashCount + event.totals.itemCount;
            return (
              <li key={event.id}>
                <Link
                  href={href(event.id)}
                  className="flex items-center gap-3 px-4 py-4 transition hover:bg-stone-50 sm:px-5"
                >
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700"
                    aria-hidden="true"
                  >
                    <HandHeart className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-semibold leading-snug text-stone-900">
                      {event.title}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-stone-500">
                      {event.heldOn ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" aria-hidden="true" />
                          <time dateTime={event.heldOn}>{formatDay(event.heldOn)}</time>
                        </span>
                      ) : null}
                      <span>{count} lượt</span>
                    </span>
                    <span className="mt-1 block text-sm font-semibold tabular-nums text-red-900">
                      {meritTotalsLine(event.totals)}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-stone-400" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Presence>
        {creating ? (
          <MeritEventDialog
            familySlug={familySlug}
            editing={null}
            onClose={() => setCreating(false)}
            // Straight into the new event to record its donations.
            onSaved={(event) => router.push(href(event.id))}
          />
        ) : null}
      </Presence>
    </div>
  );
}
