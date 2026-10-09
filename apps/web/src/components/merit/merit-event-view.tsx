'use client';

import { Banknote, CalendarDays, Gift, HandHeart, PencilLine, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { InlineLoader } from '@/components/ui/heritage-loader';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { heroIconButtonClass, heroOverlapClass, PageHero } from '@/components/layout/page-hero';
import { MeritDonationDialog } from '@/components/merit/merit-donation-dialog';
import { MeritEventDialog } from '@/components/merit/merit-event-dialog';
import { Button } from '@/components/ui/button';
import { Presence } from '@/components/ui/presence';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  deleteMeritEvent,
  type MeritDonation,
  type MeritEventDetail,
  type MeritTotals,
} from '@/lib/merit-api';
import { cn } from '@/lib/utils';
import { formatVnd, vndInWords } from '@/lib/vietnamese-number';
import { formatDay } from '@/lib/vietnam-date';

/**
 * Oldest first, so a donor keeps their number (STT) as new donations are added; on the same day,
 * in the order they were written.
 */
function inOrder(a: MeritDonation, b: MeritDonation): number {
  return a.donatedOn.localeCompare(b.donatedOn) || a.createdAt.localeCompare(b.createdAt);
}

function totalsAfter(
  totals: MeritTotals,
  removed: MeritDonation | null,
  added: MeritDonation | null,
): MeritTotals {
  const next = { ...totals };
  for (const [donation, sign] of [
    [removed, -1],
    [added, 1],
  ] as const) {
    if (!donation) continue;
    if (donation.kind === 'CASH') {
      next.cashAmount += sign * (donation.amount ?? 0);
      next.cashCount += sign;
    } else {
      next.itemCount += sign;
    }
  }
  return next;
}

/** One Công đức event: its totals, the clan head's tools, and the list of donors. */
export function MeritEventView({
  familySlug,
  initial,
}: {
  familySlug: string;
  initial: MeritEventDetail;
}) {
  const confirm = useConfirm();
  const router = useRouter();
  const showToast = useToast();
  const [event, setEvent] = useState(initial.event);
  const [donations, setDonations] = useState(initial.donations);
  const [editingEvent, setEditingEvent] = useState(false);
  const [donationDialog, setDonationDialog] = useState<{ editing: MeritDonation | null } | null>(
    null,
  );
  const [deletingEvent, setDeletingEvent] = useState(false);
  const canManage = initial.canManage;
  const listHref = `/${encodeURIComponent(familySlug)}/cong-duc`;
  const totals = event.totals;

  const rows = [...donations].sort(inOrder);

  function saved(donation: MeritDonation, previous: MeritDonation | null): void {
    setDonations((current) =>
      previous
        ? current.map((item) => (item.id === donation.id ? donation : item))
        : [donation, ...current],
    );
    setEvent((current) => ({
      ...current,
      totals: totalsAfter(current.totals, previous, donation),
    }));
  }

  function removed(donation: MeritDonation): void {
    setDonations((current) => current.filter((item) => item.id !== donation.id));
    setEvent((current) => ({ ...current, totals: totalsAfter(current.totals, donation, null) }));
  }

  async function removeEvent(): Promise<void> {
    const count = donations.length;
    const warning = count > 0 ? ` cùng ${count} lượt công đức đã ghi` : '';
    if (
      !(await confirm({
        title: `Xóa sự kiện “${event.title}”${warning}?`,
        message: 'Không thể hoàn tác.',
        confirmLabel: 'Xóa',
        tone: 'danger',
      }))
    )
      return;
    setDeletingEvent(true);
    try {
      await deleteMeritEvent(familySlug, event.id);
      showToast({ kind: 'success', message: `Đã xóa sự kiện “${event.title}”.` });
      router.push(listHref);
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'xóa sự kiện') });
      setDeletingEvent(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-3 pb-6 sm:gap-4 sm:px-4 sm:py-6 lg:max-w-5xl lg:px-8 lg:py-8">
      <PageHero
        title={event.title}
        icon={HandHeart}
        back={{ href: listHref, label: 'Công đức' }}
        description={
          event.heldOn || event.description ? (
            <>
              {event.heldOn ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  <time dateTime={event.heldOn}>{formatDay(event.heldOn)}</time>
                </span>
              ) : null}
              {event.description ? (
                <span className="mt-1 block whitespace-pre-line">{event.description}</span>
              ) : null}
            </>
          ) : null
        }
        actions={
          canManage ? (
            <>
              <button
                type="button"
                className={heroIconButtonClass}
                aria-label="Sửa sự kiện"
                onClick={() => setEditingEvent(true)}
              >
                <PencilLine className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={heroIconButtonClass}
                aria-label="Xóa sự kiện"
                disabled={deletingEvent}
                onClick={() => void removeEvent()}
              >
                {deletingEvent ? (
                  <InlineLoader className="size-4" />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
              </button>
            </>
          ) : null
        }
        overlap
      />

      <section aria-label="Tổng công đức" className={cn('surface p-4 sm:p-5', heroOverlapClass)}>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="min-w-0 rounded-xl bg-brand-50/70 px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-stone-600">
              <Banknote className="size-4 text-brand-700" aria-hidden="true" />
              Tiền mặt · {totals.cashCount} lượt
            </dt>
            <dd className="mt-0.5 break-words text-lg font-bold tabular-nums text-brand-800">
              {formatVnd(totals.cashAmount)}
            </dd>
          </div>
          <div className="min-w-0 rounded-xl bg-amber-50/80 px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-stone-600">
              <Gift className="size-4 text-amber-700" aria-hidden="true" />
              Hiện vật
            </dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-amber-900">
              {totals.itemCount} lượt
            </dd>
          </div>
        </dl>
        {totals.cashAmount > 0 ? (
          <p className="mt-2.5 text-xs italic leading-5 text-stone-500">
            Tiền mặt bằng chữ: {vndInWords(totals.cashAmount)}
          </p>
        ) : null}
        {canManage ? (
          <Button
            type="button"
            className="mt-4 w-full"
            onClick={() => setDonationDialog({ editing: null })}
          >
            <Plus className="size-4" aria-hidden="true" />
            Ghi công đức
          </Button>
        ) : null}
      </section>

      <section
        aria-labelledby="merit-donors-title"
        className="surface mx-3 overflow-hidden sm:mx-0"
      >
        <div className="border-b border-line px-4 py-3 sm:px-5">
          <h2 id="merit-donors-title" className="font-semibold text-stone-900">
            Danh sách công đức
          </h2>
          {canManage && rows.length > 0 ? (
            <p className="mt-0.5 text-xs text-stone-500">Bấm vào một dòng để sửa hoặc xóa.</p>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <div className="grid justify-items-center gap-2 px-6 py-12 text-center text-sm text-stone-500">
            <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
              <HandHeart className="size-6" aria-hidden="true" />
            </span>
            {canManage
              ? 'Chưa có lượt công đức nào. Bấm “Ghi công đức” để thêm.'
              : 'Sự kiện chưa có lượt công đức nào.'}
          </div>
        ) : (
          <table className="w-full table-fixed border-collapse text-sm">
            <thead className="bg-paper text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500 sm:text-xs">
              <tr>
                <th scope="col" className="w-8 py-2 pl-3 pr-1 text-center sm:w-14 sm:pl-5">
                  STT
                </th>
                <th scope="col" className="w-[38%] px-2 py-2 sm:px-3">
                  Tên
                </th>
                <th scope="col" className="py-2 pl-2 pr-3 sm:px-3 sm:pr-5">
                  Nội dung
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((donation, index) => {
                // The clan head taps a row to edit or delete it, so no column goes to buttons.
                const edit = canManage
                  ? (): void => setDonationDialog({ editing: donation })
                  : undefined;
                return (
                  <tr
                    key={donation.id}
                    className={cn(
                      'align-top',
                      edit && 'cursor-pointer transition hover:bg-paper/60 active:bg-paper',
                    )}
                    onClick={edit}
                  >
                    <td className="py-3 pl-3 pr-1 text-center tabular-nums text-stone-500 sm:pl-5">
                      {index + 1}
                    </td>
                    <td className="break-words px-2 py-3 font-medium text-stone-900 sm:px-3">
                      {edit ? (
                        <button
                          type="button"
                          className="text-left focus-visible:underline focus-visible:outline-none"
                          aria-label={`Sửa lượt công đức của ${donation.donorName}`}
                        >
                          {donation.donorName}
                        </button>
                      ) : (
                        donation.donorName
                      )}
                    </td>
                    <td className="break-words py-3 pl-2 pr-3 sm:px-3 sm:pr-5">
                      <span className="font-semibold text-brand-800">
                        {donation.kind === 'CASH'
                          ? formatVnd(donation.amount ?? 0)
                          : donation.itemContent}
                      </span>
                      {donation.note ? (
                        <span className="mt-0.5 block text-xs text-stone-500">{donation.note}</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <Presence>
        {editingEvent ? (
          <MeritEventDialog
            familySlug={familySlug}
            editing={event}
            onClose={() => setEditingEvent(false)}
            onSaved={(updated) => {
              setEvent(updated);
              setEditingEvent(false);
            }}
          />
        ) : null}
      </Presence>
      <Presence>
        {donationDialog ? (
          <MeritDonationDialog
            // A fresh form for each donation being edited.
            key={donationDialog.editing?.id ?? 'new'}
            familySlug={familySlug}
            eventId={event.id}
            editing={donationDialog.editing}
            onClose={() => setDonationDialog(null)}
            onSaved={saved}
            onDeleted={removed}
          />
        ) : null}
      </Presence>
    </div>
  );
}
