'use client';

import { CalendarHeart, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Presence } from '@/components/ui/presence';
import { SheetDialog } from '@/components/ui/sheet-dialog';
import { cn } from '@/lib/utils';

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** What the lunar months are called; tháng Một is the 11th. */
const LUNAR_MONTH_NAMES = [
  'Giêng',
  'Hai',
  'Ba',
  'Tư',
  'Năm',
  'Sáu',
  'Bảy',
  'Tám',
  'Chín',
  'Mười',
  'Một',
  'Chạp',
] as const;

type DeathAnniversaryPickerProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Overrides the legend so the picker can also label a person's giỗ. */
  label?: string;
  /** Lunar months never exceed 30 days; solar anniversaries keep the default. */
  maxDayInMonth?: number;
  required?: boolean;
  disabled?: boolean;
};

type DayMonth = { day: number | null; month: number | null };

function parseValue(value: string): DayMonth {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return { day: null, month: null };

  const day = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > DAYS_IN_MONTH[month - 1]!) {
    return { day: null, month: null };
  }

  return { day, month };
}

function formatValue(day: number, month: number): string {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

function lastDay(month: number | null, maxDayInMonth: number): number {
  return Math.min(month === null ? 31 : DAYS_IN_MONTH[month - 1]!, maxDayInMonth);
}

/** "Mùng 5 tháng Giêng" for a lunar date, "05/01" for a solar one. */
function describe({ day, month }: DayMonth, lunar: boolean): string {
  if (day === null || month === null) return '';
  if (!lunar) return formatValue(day, month);
  return `${day <= 10 ? 'Mùng ' + day : 'Ngày ' + day} tháng ${LUNAR_MONTH_NAMES[month - 1]}`;
}

function AnniversaryDialog({
  title,
  value,
  maxDayInMonth,
  lunar,
  required,
  onDone,
  onClose,
}: {
  title: string;
  value: string;
  maxDayInMonth: number;
  lunar: boolean;
  required: boolean;
  onDone: (value: string) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<DayMonth>(() => parseValue(value));
  const maximumDay = lastDay(picked.month, maxDayInMonth);
  const complete = picked.day !== null && picked.month !== null;

  function pickMonth(month: number): void {
    // A day the new month does not have moves back to its last day.
    setPicked(({ day }) => ({
      month,
      day: day === null ? null : Math.min(day, lastDay(month, maxDayInMonth)),
    }));
  }

  return (
    <SheetDialog
      title={title}
      onClose={onClose}
      footer={
        <>
          {required ? null : (
            <Button type="button" variant="outline" onClick={() => onDone('')}>
              Xóa ngày giỗ
            </Button>
          )}
          <Button
            type="button"
            disabled={!complete}
            onClick={() => complete && onDone(formatValue(picked.day!, picked.month!))}
          >
            Xong
          </Button>
        </>
      }
    >
      <p className="text-center font-display text-xl font-bold text-wood-800" aria-live="polite">
        {describe(picked, lunar) ||
          (picked.month === null ? 'Chọn tháng, rồi chọn ngày' : 'Chọn ngày')}
      </p>

      <section className="grid gap-2" aria-label="Tháng">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-wood-600">
          Tháng{lunar ? ' âm lịch' : ''}
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {LUNAR_MONTH_NAMES.map((name, index) => {
            const month = index + 1;
            const selected = picked.month === month;
            return (
              <button
                key={name}
                type="button"
                aria-pressed={selected}
                onClick={() => pickMonth(month)}
                className={cn(
                  'grid h-14 place-items-center rounded-xl border text-sm transition',
                  selected
                    ? 'border-brand-700 bg-brand-700 text-white shadow-sm'
                    : 'border-gold-500/30 bg-white text-wood-800 hover:border-brand-700/40 hover:bg-gold-50',
                )}
              >
                <span className="font-semibold tabular-nums">Tháng {month}</span>
                {lunar ? (
                  <span
                    className={cn('-mt-1 text-xs', selected ? 'text-white/80' : 'text-stone-500')}
                  >
                    {name}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-2" aria-label="Ngày">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-wood-600">Ngày</h3>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
            const selected = picked.day === day;
            const unavailable = day > maximumDay;
            if (unavailable && day > maxDayInMonth) return null;
            return (
              <button
                key={day}
                type="button"
                aria-pressed={selected}
                disabled={unavailable}
                onClick={() => setPicked((current) => ({ ...current, day }))}
                className={cn(
                  'grid aspect-square place-items-center rounded-full text-sm tabular-nums transition',
                  selected
                    ? 'bg-brand-700 font-semibold text-white shadow-sm'
                    : 'text-stone-800 hover:bg-gold-100',
                  unavailable && 'cursor-not-allowed opacity-25 hover:bg-transparent',
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </section>
    </SheetDialog>
  );
}

/**
 * A death anniversary as day and month: a field that opens month and day
 * grids. `value` and `onChange` use `DD/MM`, or '' for none.
 */
export function DeathAnniversaryPicker({
  id,
  value,
  onChange,
  label = 'Ngày giỗ họ',
  maxDayInMonth = 31,
  required = false,
  disabled = false,
}: DeathAnniversaryPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const lunar = maxDayInMonth <= 30;
  const parsed = parseValue(value);
  const shown = describe(parsed, lunar);
  const canClear = Boolean(shown) && !required && !disabled;

  function close(): void {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-brand-950" htmlFor={id}>
        {label}
      </label>
      <span className="relative block">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 text-left text-base outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 sm:text-sm',
            canClear && 'pr-10',
          )}
        >
          <span className={cn('truncate', shown ? 'text-stone-900' : 'text-stone-400')}>
            {shown || 'Chọn ngày giỗ'}
          </span>
          {canClear ? null : (
            <CalendarHeart className="size-4 shrink-0 text-stone-500" aria-hidden="true" />
          )}
        </button>
        {canClear ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label={`Xóa ${label.toLowerCase()}`}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
        {required ? (
          // Keeps the form's own "required" check: an empty anniversary blocks
          // the submit, and focusing this box opens the picker.
          <input
            tabIndex={-1}
            aria-hidden="true"
            required
            value={value}
            onChange={() => undefined}
            onFocus={() => setOpen(true)}
            className="pointer-events-none absolute inset-0 opacity-0"
          />
        ) : null}
      </span>

      <Presence>
        {open ? (
          <AnniversaryDialog
            title={label}
            value={value}
            maxDayInMonth={maxDayInMonth}
            lunar={lunar}
            required={required}
            onDone={(next) => {
              onChange(next);
              close();
            }}
            onClose={close}
          />
        ) : null}
      </Presence>
    </div>
  );
}
