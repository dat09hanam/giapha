'use client';

import {
  ArrowDownLeft,
  ArrowUpRight,
  LoaderCircle,
  PencilLine,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  Wallet,
} from 'lucide-react';
import { Fragment, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  createFundEntry,
  deleteFundEntry,
  MAX_FUND_AMOUNT,
  updateFundEntry,
  type FundEntry,
  type FundEntryInput,
  type FundEntryKind,
  type FundLedger,
} from '@/lib/fund-api';
import { cn } from '@/lib/utils';
import { formatAmountInput, formatVnd, vndInWords } from '@/lib/vietnamese-number';
import { formatDay, todayInVietnam } from '@/lib/vietnam-date';

type Filter = 'ALL' | FundEntryKind;

const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'INCOME', label: 'Thu' },
  { value: 'EXPENSE', label: 'Chi' },
];

/** `2026-10-05` → `Tháng 10/2026`. */
function monthLabel(day: string): string {
  const [year, month] = day.split('-');
  return `Tháng ${Number(month)}/${year}`;
}

/** Newest day first; on the same day, the line written last first, as the API orders them. */
function byDay(a: FundEntry, b: FundEntry): number {
  return b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt);
}

const signed = (entry: Pick<FundEntry, 'kind' | 'amount'>): number =>
  entry.kind === 'INCOME' ? entry.amount : -entry.amount;

function totalsAfter(
  totals: FundLedger['totals'],
  removed: FundEntry | null,
  added: FundEntry | null,
): FundLedger['totals'] {
  let { income, expense } = totals;
  for (const [entry, sign] of [
    [removed, -1],
    [added, 1],
  ] as const) {
    if (!entry) continue;
    if (entry.kind === 'INCOME') income += sign * entry.amount;
    else expense += sign * entry.amount;
  }
  return { income, expense, balance: income - expense };
}

/** The three fields the clan head fills in: what, which way, how much. */
function EntryForm({
  editing,
  saving,
  onSubmit,
  onCancelEdit,
}: {
  editing: FundEntry | null;
  saving: boolean;
  onSubmit: (input: FundEntryInput) => Promise<boolean>;
  onCancelEdit: () => void;
}) {
  const [content, setContent] = useState(editing?.content ?? '');
  const [kind, setKind] = useState<FundEntryKind>(editing?.kind ?? 'INCOME');
  const [amountText, setAmountText] = useState(
    editing ? formatAmountInput(String(editing.amount)) : '',
  );
  const [occurredOn, setOccurredOn] = useState(() => editing?.occurredOn ?? todayInVietnam());
  const amount = Number(amountText.replace(/\D/g, '')) || 0;
  const tooLarge = amount > MAX_FUND_AMOUNT;
  const valid =
    content.trim().length > 0 && amount > 0 && !tooLarge && /^\d{4}-\d{2}-\d{2}$/.test(occurredOn);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!valid || saving) return;
    const done = await onSubmit({ content: content.trim(), kind, amount, occurredOn });
    if (done && !editing) {
      setContent('');
      setAmountText('');
      // The day stays: several lines are often written for the same day.
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="grid gap-4 bg-white px-4 py-4 shadow-sm sm:rounded-2xl sm:border sm:border-stone-200 sm:px-5"
      aria-label={editing ? 'Sửa khoản thu chi' : 'Ghi khoản thu chi mới'}
    >
      <h2 className="flex items-center gap-2 font-semibold text-emerald-950">
        {editing ? (
          <PencilLine className="size-4 text-amber-700" aria-hidden="true" />
        ) : (
          <Plus className="size-4 text-emerald-700" aria-hidden="true" />
        )}
        {editing ? 'Sửa khoản thu chi' : 'Ghi khoản mới'}
      </h2>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-stone-700" htmlFor="fund-date">
          Ngày (Dương lịch)
        </label>
        <DatePicker id="fund-date" value={occurredOn} onChange={setOccurredOn} />
      </div>

      <label className="grid gap-1.5" htmlFor="fund-content">
        <span className="text-sm font-medium text-stone-700">Nội dung</span>
        <input
          id="fund-content"
          className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-base outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 sm:text-sm"
          placeholder="Ví dụ: Đóng góp giỗ tổ của chi trưởng"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={500}
          required
        />
      </label>

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-stone-700">Thu/Chi</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['INCOME', 'EXPENSE'] as const).map((value) => {
            const selected = kind === value;
            const income = value === 'INCOME';
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setKind(value)}
                className={cn(
                  'flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition',
                  selected
                    ? income
                      ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                      : 'border-red-700 bg-red-700 text-white shadow-sm'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50',
                )}
              >
                {income ? (
                  <ArrowDownLeft className="size-4" aria-hidden="true" />
                ) : (
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                )}
                {income ? 'Thu' : 'Chi'}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="grid gap-1.5" htmlFor="fund-amount">
        <span className="text-sm font-medium text-stone-700">Số tiền</span>
        <span className="relative">
          <input
            id="fund-amount"
            inputMode="numeric"
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-3 pr-9 text-right text-base font-semibold tabular-nums outline-none transition placeholder:font-normal placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            placeholder="0"
            value={amountText}
            onChange={(event) => setAmountText(formatAmountInput(event.target.value))}
            required
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-500">
            ₫
          </span>
        </span>
        <span
          className={cn('min-h-5 text-xs italic', tooLarge ? 'text-red-700' : 'text-stone-500')}
          aria-live="polite"
        >
          {tooLarge ? 'Số tiền quá lớn.' : amount > 0 ? vndInWords(amount) : null}
        </span>
      </label>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {editing ? (
          <Button type="button" variant="ghost" onClick={onCancelEdit} disabled={saving}>
            Hủy sửa
          </Button>
        ) : null}
        <Button type="submit" disabled={!valid || saving} className="sm:min-w-40">
          {saving ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {editing ? 'Lưu thay đổi' : 'Ghi vào sổ'}
        </Button>
      </div>
    </form>
  );
}

/**
 * Quỹ họ: the balance in figures and in words, the clan head's form, and the
 * ledger every member can read.
 */
export function FamilyFund({ familySlug, initial }: { familySlug: string; initial: FundLedger }) {
  const showToast = useToast();
  const [entries, setEntries] = useState(initial.entries);
  const [totals, setTotals] = useState(initial.totals);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [editing, setEditing] = useState<FundEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const canManage = initial.canManage;
  const visible = filter === 'ALL' ? entries : entries.filter((entry) => entry.kind === filter);
  const negative = totals.balance < 0;

  async function save(input: FundEntryInput): Promise<boolean> {
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateFundEntry(familySlug, editing.id, input);
        setEntries((current) =>
          current.map((entry) => (entry.id === updated.id ? updated : entry)).sort(byDay),
        );
        setTotals((current) => totalsAfter(current, editing, updated));
        setEditing(null);
        showToast({ kind: 'success', message: 'Đã lưu thay đổi.' });
      } else {
        const created = await createFundEntry(familySlug, input);
        setEntries((current) => [created, ...current].sort(byDay));
        setTotals((current) => totalsAfter(current, null, created));
        showToast({
          kind: 'success',
          message: `Đã ghi khoản ${created.kind === 'INCOME' ? 'thu' : 'chi'} ${formatVnd(created.amount)}.`,
        });
      }
      return true;
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'ghi sổ quỹ') });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function remove(entry: FundEntry): Promise<void> {
    if (!window.confirm(`Xóa khoản “${entry.content}” (${formatVnd(entry.amount)})?`)) return;
    setBusyId(entry.id);
    try {
      await deleteFundEntry(familySlug, entry.id);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setTotals((current) => totalsAfter(current, entry, null));
      if (editing?.id === entry.id) setEditing(null);
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'xóa khoản thu chi') });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-2 pb-6 sm:gap-4 sm:px-4 sm:py-6">
      <section
        aria-labelledby="fund-balance-title"
        className="relative overflow-hidden bg-gradient-to-br from-emerald-900 to-emerald-950 px-5 py-6 text-white shadow-sm sm:rounded-2xl"
      >
        <Wallet
          className="pointer-events-none absolute -right-4 -top-4 size-32 text-white/5"
          aria-hidden="true"
        />
        <h1 id="fund-balance-title" className="text-sm font-medium text-emerald-100/80">
          Số dư quỹ họ
        </h1>
        <p
          className={cn(
            'mt-1 break-words text-4xl font-bold tabular-nums tracking-tight sm:text-5xl',
            negative && 'text-red-200',
          )}
        >
          {formatVnd(totals.balance)}
        </p>
        <p className="mt-2 text-sm italic leading-6 text-emerald-50/90">
          Bằng chữ: {vndInWords(totals.balance)}
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
          <div>
            <dt className="flex items-center gap-1.5 text-emerald-100/70">
              <ArrowDownLeft className="size-4 text-emerald-300" aria-hidden="true" />
              Tổng thu
            </dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{formatVnd(totals.income)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-emerald-100/70">
              <ArrowUpRight className="size-4 text-red-300" aria-hidden="true" />
              Tổng chi
            </dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{formatVnd(totals.expense)}</dd>
          </div>
        </dl>
      </section>

      {canManage ? (
        <div ref={formRef}>
          <EntryForm
            // A fresh form for each line being edited, and an empty one after.
            key={editing?.id ?? 'new'}
            editing={editing}
            saving={saving}
            onSubmit={save}
            onCancelEdit={() => setEditing(null)}
          />
        </div>
      ) : null}

      <section
        aria-labelledby="fund-ledger-title"
        className="bg-white shadow-sm sm:rounded-2xl sm:border sm:border-stone-200"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 sm:px-5">
          <h2
            id="fund-ledger-title"
            className="flex items-center gap-2 font-semibold text-emerald-950"
          >
            <ReceiptText className="size-4 text-emerald-700" aria-hidden="true" />
            Sổ thu chi
          </h2>
          <div
            className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1"
            role="group"
            aria-label="Lọc theo loại"
          >
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  'h-8 rounded-lg px-3 text-sm font-medium transition',
                  filter === value
                    ? 'bg-white text-emerald-950 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="grid justify-items-center gap-2 px-6 py-12 text-center text-sm text-stone-500">
            <span className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700">
              <ReceiptText className="size-6" aria-hidden="true" />
            </span>
            {entries.length === 0
              ? canManage
                ? 'Sổ quỹ còn trống. Hãy ghi khoản đầu tiên ở trên.'
                : 'Sổ quỹ chưa có khoản nào.'
              : 'Không có khoản nào thuộc loại này.'}
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {visible.map((entry, index) => {
              const income = entry.kind === 'INCOME';
              const month = monthLabel(entry.occurredOn);
              const newMonth = index === 0 || monthLabel(visible[index - 1]!.occurredOn) !== month;
              return (
                <Fragment key={entry.id}>
                  {newMonth ? (
                    <li className="bg-stone-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500 sm:px-5">
                      {month}
                    </li>
                  ) : null}
                  <li
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 sm:px-5',
                      editing?.id === entry.id && 'bg-amber-50',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-10 shrink-0 place-items-center rounded-full',
                        income ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
                      )}
                      aria-hidden="true"
                    >
                      {income ? (
                        <ArrowDownLeft className="size-5" />
                      ) : (
                        <ArrowUpRight className="size-5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[15px] font-medium leading-snug text-stone-900">
                        {entry.content}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        <time dateTime={entry.occurredOn}>{formatDay(entry.occurredOn)}</time> ·{' '}
                        {income ? 'Thu' : 'Chi'}
                      </p>
                    </div>
                    <div className="grid shrink-0 justify-items-end gap-1">
                      <span
                        className={cn(
                          'font-semibold tabular-nums',
                          income ? 'text-emerald-700' : 'text-red-700',
                        )}
                      >
                        {income ? '+' : '−'}
                        {formatVnd(Math.abs(signed(entry)))}
                      </span>
                      {canManage ? (
                        <span className="flex gap-1">
                          <button
                            type="button"
                            className="grid size-8 place-items-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                            aria-label={`Sửa khoản ${entry.content}`}
                            onClick={() => {
                              setEditing(entry);
                              formRef.current?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                              });
                            }}
                          >
                            <PencilLine className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="grid size-8 place-items-center rounded-full text-stone-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                            aria-label={`Xóa khoản ${entry.content}`}
                            disabled={busyId === entry.id}
                            onClick={() => void remove(entry)}
                          >
                            {busyId === entry.id ? (
                              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Trash2 className="size-4" aria-hidden="true" />
                            )}
                          </button>
                        </span>
                      ) : null}
                    </div>
                  </li>
                </Fragment>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
