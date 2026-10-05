'use client';

import { CalendarDays, ChevronRight, HandHeart, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { MeritEventDialog } from '@/components/merit/merit-event-dialog';
import { heroButtonClass, heroOverlapClass, PageHero } from '@/components/layout/page-hero';
import { Presence } from '@/components/ui/presence';
import type { MeritOverview, MeritTotals } from '@/lib/merit-api';
import { cn } from '@/lib/utils';
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
    <div className="mx-auto grid w-full max-w-2xl gap-3 pb-6 sm:gap-4 sm:px-4 sm:py-6 lg:max-w-5xl lg:px-8 lg:py-8">
      <PageHero
        title="Công đức"
        icon={HandHeart}
        description="Ghi nhận tấm lòng của con cháu và quan khách đóng góp tiền mặt hoặc hiện vật cho các sự kiện của dòng họ."
        actions={
          canManage ? (
            <button type="button" className={heroButtonClass} onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Tạo sự kiện
            </button>
          ) : null
        }
        overlap
      />

      {events.length === 0 ? (
        <div
          className={cn(
            'surface grid justify-items-center gap-2 px-6 py-12 text-center text-sm text-stone-500',
            heroOverlapClass,
          )}
        >
          <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
            <HandHeart className="size-6" aria-hidden="true" />
          </span>
          {canManage
            ? 'Chưa có sự kiện nào. Hãy tạo sự kiện đầu tiên để ghi công đức.'
            : 'Dòng họ chưa có sự kiện công đức nào.'}
        </div>
      ) : (
        <div className={cn('surface overflow-hidden', heroOverlapClass)}>
          <ul aria-label="Sự kiện công đức" className="divide-y divide-line lg:hidden">
            {events.map((event) => {
              const count = event.totals.cashCount + event.totals.itemCount;
              return (
                <li key={event.id}>
                  <Link
                    href={href(event.id)}
                    className="flex items-center gap-3 px-4 py-4 transition hover:bg-paper/60 sm:px-5"
                  >
                    <span
                      className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100"
                      aria-hidden="true"
                    >
                      <HandHeart className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-semibold leading-snug text-brand-900">
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
                      <span className="mt-1 block text-sm font-semibold tabular-nums text-brand-800">
                        {meritTotalsLine(event.totals)}
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-stone-400" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
          {/* Desktops list the events as a table, each row opening its donors. */}
          <table className="hidden w-full text-sm lg:table">
            <thead className="bg-paper text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
              <tr>
                <th scope="col" className="w-32 px-5 py-2.5">
                  Ngày
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Sự kiện
                </th>
                <th scope="col" className="w-44 px-3 py-2.5 text-right">
                  Tiền mặt
                </th>
                <th scope="col" className="w-28 px-3 py-2.5 text-right">
                  Hiện vật
                </th>
                <th scope="col" className="w-24 px-3 py-2.5 text-right">
                  Số lượt
                </th>
                <th scope="col" className="w-12 px-5 py-2.5">
                  <span className="sr-only">Mở</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events.map((event) => (
                <tr
                  key={event.id}
                  className="cursor-pointer transition hover:bg-paper/60"
                  onClick={() => router.push(href(event.id))}
                >
                  <td className="px-5 py-3.5 tabular-nums text-stone-600">
                    {event.heldOn ? (
                      <time dateTime={event.heldOn}>{formatDay(event.heldOn)}</time>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    <Link
                      href={href(event.id)}
                      className="flex items-center gap-2.5 font-semibold text-brand-900 hover:underline"
                    >
                      <HandHeart className="size-5 shrink-0 text-brand-700" aria-hidden="true" />
                      {event.title}
                    </Link>
                  </td>
                  <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-brand-800">
                    {event.totals.cashCount > 0 ? formatVnd(event.totals.cashAmount) : '—'}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums text-stone-700">
                    {event.totals.itemCount > 0 ? event.totals.itemCount : '—'}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums text-stone-700">
                    {event.totals.cashCount + event.totals.itemCount}
                  </td>
                  <td className="px-5 py-3.5 text-stone-400">
                    <ChevronRight className="size-5" aria-hidden="true" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
