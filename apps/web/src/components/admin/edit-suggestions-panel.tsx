'use client';

import {
  Check,
  CheckCircle2,
  Clock3,
  Inbox,
  LoaderCircle,
  PencilLine,
  RotateCcw,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { updateEditSuggestionStatus } from '@/lib/edit-suggestion-api';
import { displayPersonTitle } from '@/lib/person-name';
import { cn } from '@/lib/utils';
import type { EditSuggestion, SuggestionStatus } from '@/types/edit-suggestion';

const FILTERS: readonly { status: SuggestionStatus; label: string; empty: string }[] = [
  {
    status: 'PENDING',
    label: 'Chờ duyệt',
    empty: 'Không có đề xuất nào đang chờ. Mọi việc đã xong!',
  },
  { status: 'RESOLVED', label: 'Đã xử lý', empty: 'Chưa có đề xuất nào được xử lý.' },
  { status: 'DISMISSED', label: 'Bỏ qua', empty: 'Chưa bỏ qua đề xuất nào.' },
];

const CLOSED_BADGE: Record<
  Exclude<SuggestionStatus, 'PENDING'>,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  RESOLVED: { label: 'Đã xử lý', className: 'bg-emerald-100 text-emerald-900', icon: CheckCircle2 },
  DISMISSED: { label: 'Đã bỏ qua', className: 'bg-stone-200 text-stone-700', icon: XCircle },
};

/** Fixed to Vietnam time so the server render and the browser agree. */
const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});

/** The designer, opened on this suggestion's person with the suggestion beside the form. */
function designerHref(familySlug: string, suggestion: EditSuggestion): string {
  const query = new URLSearchParams({ person: suggestion.person.id, suggestion: suggestion.id });
  return `/${encodeURIComponent(familySlug)}/thiet_ke?${query.toString()}`;
}

function SuggestionCard({
  familySlug,
  suggestion,
  busy,
  onChangeStatus,
}: {
  familySlug: string;
  suggestion: EditSuggestion;
  busy: boolean;
  onChangeStatus: (status: SuggestionStatus) => void;
}) {
  const pending = suggestion.status === 'PENDING';
  const badge = suggestion.status === 'PENDING' ? null : CLOSED_BADGE[suggestion.status];

  return (
    <li
      className={cn(
        'overflow-hidden rounded-2xl border bg-white shadow-sm transition',
        pending ? 'border-amber-900/15' : 'border-stone-200 opacity-90',
      )}
    >
      <div className="flex items-start gap-3 px-4 pt-4 sm:px-5">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-900"
          aria-hidden="true"
        >
          <UserRound className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-brand-950">
            {displayPersonTitle(suggestion.person)}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-500">
            <span>
              Đề xuất bởi{' '}
              <span className="font-medium text-stone-700">{suggestion.proposerName}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3" aria-hidden="true" />
              <time dateTime={suggestion.createdAt}>
                {dateFormat.format(new Date(suggestion.createdAt))}
              </time>
            </span>
          </p>
        </div>
        {badge ? (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
              badge.className,
            )}
          >
            <badge.icon className="size-3.5" aria-hidden="true" />
            {badge.label}
          </span>
        ) : null}
      </div>

      <blockquote className="mx-4 mt-3 whitespace-pre-line break-words rounded-xl border-l-4 border-amber-500 bg-amber-50/80 px-3.5 py-3 text-sm leading-6 text-stone-800 sm:mx-5">
        {suggestion.content}
      </blockquote>

      <div className="mt-4 flex flex-col gap-2 border-t border-stone-100 bg-stone-50/60 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
        {pending ? (
          <>
            <Button asChild className="sm:mr-auto">
              <Link href={designerHref(familySlug, suggestion)}>
                <PencilLine className="size-4" aria-hidden="true" />
                Chỉnh sửa thông tin
              </Link>
            </Button>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => onChangeStatus('RESOLVED')}
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="size-4" aria-hidden="true" />
                )}
                Đã xử lý
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                className="text-stone-600"
                onClick={() => onChangeStatus('DISMISSED')}
              >
                <X className="size-4" aria-hidden="true" />
                Bỏ qua
              </Button>
            </div>
          </>
        ) : (
          <>
            {suggestion.reviewedAt ? (
              <p className="text-xs text-stone-500 sm:mr-auto">
                Cập nhật lúc {dateFormat.format(new Date(suggestion.reviewedAt))}
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onChangeStatus('PENDING')}
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw className="size-4" aria-hidden="true" />
              )}
              Mở lại
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

/**
 * The clan head's inbox of changes members proposed. "Chỉnh sửa thông tin"
 * opens the designer on that person; afterwards the suggestion is marked
 * handled there or here.
 */
export function EditSuggestionsPanel({
  familySlug,
  initialSuggestions,
}: {
  familySlug: string;
  initialSuggestions: EditSuggestion[];
}) {
  const router = useRouter();
  const showToast = useToast();
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [filter, setFilter] = useState<SuggestionStatus>('PENDING');
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = Object.fromEntries(
    FILTERS.map(({ status }) => [status, suggestions.filter((s) => s.status === status).length]),
  ) as Record<SuggestionStatus, number>;
  const visible = suggestions.filter((suggestion) => suggestion.status === filter);
  const activeFilter = FILTERS.find((entry) => entry.status === filter) ?? FILTERS[0]!;

  async function changeStatus(id: string, status: SuggestionStatus): Promise<void> {
    setBusyId(id);
    try {
      const updated = await updateEditSuggestionStatus(familySlug, id, status);
      setSuggestions((current) => current.map((entry) => (entry.id === id ? updated : entry)));
      // Refreshes the pending count on the tab; this list keeps its own state.
      router.refresh();
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'cập nhật đề xuất') });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="grid min-w-0 gap-4" aria-labelledby="edit-suggestions-title">
      <header className="grid gap-1">
        <h2 id="edit-suggestions-title" className="text-lg font-semibold text-brand-950">
          Đề xuất chỉnh sửa
        </h2>
      </header>

      <div
        className="grid grid-cols-3 gap-1 rounded-2xl border border-brand-950/10 bg-white/70 p-1 shadow-sm sm:w-fit sm:min-w-96"
        role="group"
        aria-label="Lọc đề xuất theo trạng thái"
      >
        {FILTERS.map(({ status, label }) => {
          const selected = filter === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(status)}
              className={cn(
                'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-medium transition',
                selected
                  ? 'bg-brand-900 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-brand-50 hover:text-brand-950',
              )}
            >
              <span className="truncate">{label}</span>
              <span
                className={cn(
                  'min-w-5 rounded-full px-1.5 text-xs leading-5',
                  selected
                    ? 'bg-white/20'
                    : status === 'PENDING' && counts.PENDING > 0
                      ? 'bg-red-600 text-white'
                      : 'bg-stone-100 text-stone-600',
                )}
              >
                {counts[status]}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-brand-950/15 bg-white/50 px-4 py-14 text-center text-sm text-stone-500">
          <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
            <Inbox className="size-6" aria-hidden="true" />
          </span>
          {activeFilter.empty}
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visible.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              familySlug={familySlug}
              suggestion={suggestion}
              busy={busyId === suggestion.id}
              onChangeStatus={(status) => void changeStatus(suggestion.id, status)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
