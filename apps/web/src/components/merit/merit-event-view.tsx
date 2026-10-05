'use client';

import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  Gift,
  HandHeart,
  LoaderCircle,
  PencilLine,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { MeritDonationDialog } from '@/components/merit/merit-donation-dialog';
import { MeritEventDialog } from '@/components/merit/merit-event-dialog';
import { Button } from '@/components/ui/button';
import { Presence } from '@/components/ui/presence';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  deleteMeritDonation,
  deleteMeritEvent,
  type MeritDonation,
  type MeritEventDetail,
  type MeritTotals,
} from '@/lib/merit-api';
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
  const router = useRouter();
  const showToast = useToast();
  const [event, setEvent] = useState(initial.event);
  const [donations, setDonations] = useState(initial.donations);
  const [editingEvent, setEditingEvent] = useState(false);
  const [donationDialog, setDonationDialog] = useState<{ editing: MeritDonation | null } | null>(
    null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
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

  async function removeDonation(donation: MeritDonation): Promise<void> {
    const what = donation.amount !== null ? formatVnd(donation.amount) : donation.itemContent;
    if (!window.confirm(`Xóa lượt công đức của ${donation.donorName} (${what})?`)) return;
    setBusyId(donation.id);
    try {
      await deleteMeritDonation(familySlug, donation.id);
      setDonations((current) => current.filter((item) => item.id !== donation.id));
      setEvent((current) => ({ ...current, totals: totalsAfter(current.totals, donation, null) }));
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'xóa lượt công đức') });
    } finally {
      setBusyId(null);
    }
  }

  async function removeEvent(): Promise<void> {
    const count = donations.length;
    const warning = count > 0 ? ` cùng ${count} lượt công đức đã ghi` : '';
    if (!window.confirm(`Xóa sự kiện “${event.title}”${warning}? Không thể hoàn tác.`)) return;
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
    <div className="mx-auto grid w-full max-w-2xl gap-2 pb-6 sm:gap-4 sm:px-4 sm:py-6">
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-800 to-red-900 px-5 pb-6 pt-4 text-white shadow-sm sm:rounded-2xl">
        <HandHeart
          className="pointer-events-none absolute -right-4 -top-4 size-32 text-white/10"
          aria-hidden="true"
        />
        <Link
          href={listHref}
          className="inline-flex items-center gap-1 text-sm text-amber-50/80 hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Công đức
        </Link>
        <h1 className="mt-2 break-words text-2xl font-bold leading-tight tracking-tight">
          {event.title}
        </h1>
        {event.heldOn ? (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-amber-50/90">
            <CalendarDays className="size-4" aria-hidden="true" />
            <time dateTime={event.heldOn}>{formatDay(event.heldOn)}</time>
          </p>
        ) : null}
        {event.description ? (
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-amber-50/90">
            {event.description}
          </p>
        ) : null}

        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-sm">
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-amber-50/75">
              <Banknote className="size-4" aria-hidden="true" />
              Tiền mặt · {totals.cashCount} lượt
            </dt>
            <dd className="mt-0.5 break-words text-xl font-bold tabular-nums">
              {formatVnd(totals.cashAmount)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-amber-50/75">
              <Gift className="size-4" aria-hidden="true" />
              Hiện vật
            </dt>
            <dd className="mt-0.5 text-xl font-bold tabular-nums">{totals.itemCount} lượt</dd>
          </div>
        </dl>
        {totals.cashAmount > 0 ? (
          <p className="mt-3 text-xs italic leading-5 text-amber-50/80">
            Tiền mặt bằng chữ: {vndInWords(totals.cashAmount)}
          </p>
        ) : null}

        {canManage ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-white text-red-900 hover:bg-amber-50"
              onClick={() => setDonationDialog({ editing: null })}
            >
              <Plus className="size-4" aria-hidden="true" />
              Ghi công đức
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => setEditingEvent(true)}
            >
              <PencilLine className="size-4" aria-hidden="true" />
              Sửa
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-white hover:bg-white/10"
              disabled={deletingEvent}
              onClick={() => void removeEvent()}
            >
              {deletingEvent ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              Xóa
            </Button>
          </div>
        ) : null}
      </section>

      <section
        aria-labelledby="merit-donors-title"
        className="bg-white shadow-sm sm:rounded-2xl sm:border sm:border-stone-200"
      >
        <h2
          id="merit-donors-title"
          className="border-b border-stone-100 px-4 py-3 font-semibold text-red-950 sm:px-5"
        >
          Danh sách công đức
        </h2>

        {rows.length === 0 ? (
          <div className="grid justify-items-center gap-2 px-6 py-12 text-center text-sm text-stone-500">
            <span className="grid size-12 place-items-center rounded-full bg-amber-50 text-amber-700">
              <HandHeart className="size-6" aria-hidden="true" />
            </span>
            {canManage
              ? 'Chưa có lượt công đức nào. Bấm “Ghi công đức” để thêm.'
              : 'Sự kiện chưa có lượt công đức nào.'}
          </div>
        ) : (
          <table className="w-full table-fixed border-collapse text-sm">
            <thead className="bg-stone-50 text-left text-[11px] font-semibold uppercase leading-4 tracking-wide text-stone-500 sm:text-xs">
              <tr>
                <th scope="col" className="w-9 py-2 pl-3 pr-1 text-center sm:w-14 sm:pl-5">
                  STT
                </th>
                <th scope="col" className="px-2 py-2 sm:px-3">
                  Tên
                </th>
                <th scope="col" className="w-[5.75rem] px-2 py-2 sm:w-32 sm:px-3">
                  Ngày công đức
                </th>
                <th scope="col" className="px-2 py-2 sm:px-3">
                  Nội dung
                </th>
                {canManage ? (
                  <th scope="col" className="w-10 py-2 pl-1 pr-2 sm:w-20 sm:pr-5">
                    <span className="sr-only">Thao tác</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((donation, index) => (
                <tr key={donation.id} className="align-top">
                  <td className="py-3 pl-3 pr-1 text-center tabular-nums text-stone-500 sm:pl-5">
                    {index + 1}
                  </td>
                  <td className="break-words px-2 py-3 font-medium text-stone-900 sm:px-3">
                    {donation.donorName}
                  </td>
                  <td className="px-2 py-3 tabular-nums text-stone-600 sm:px-3">
                    <time dateTime={donation.donatedOn}>{formatDay(donation.donatedOn)}</time>
                  </td>
                  <td className="break-words px-2 py-3 sm:px-3">
                    <span className="font-semibold text-red-900">
                      {donation.kind === 'CASH'
                        ? formatVnd(donation.amount ?? 0)
                        : donation.itemContent}
                    </span>
                    {donation.note ? (
                      <span className="mt-0.5 block text-xs text-stone-500">{donation.note}</span>
                    ) : null}
                  </td>
                  {canManage ? (
                    <td className="py-2 pl-1 pr-2 sm:pr-5">
                      {/* Stacked on phones, so the column stays narrow. */}
                      <span className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          className="grid size-8 place-items-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                          aria-label={`Sửa lượt công đức của ${donation.donorName}`}
                          onClick={() => setDonationDialog({ editing: donation })}
                        >
                          <PencilLine className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="grid size-8 place-items-center rounded-full text-stone-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          aria-label={`Xóa lượt công đức của ${donation.donorName}`}
                          disabled={busyId === donation.id}
                          onClick={() => void removeDonation(donation)}
                        >
                          {busyId === donation.id ? (
                            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="size-4" aria-hidden="true" />
                          )}
                        </button>
                      </span>
                    </td>
                  ) : null}
                </tr>
              ))}
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
          />
        ) : null}
      </Presence>
    </div>
  );
}
