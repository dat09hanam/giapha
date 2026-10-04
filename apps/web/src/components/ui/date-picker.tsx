'use client';

import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Presence } from '@/components/ui/presence';
import { cn } from '@/lib/utils';
import { formatDay, mondayIndex, parseDay, todayInVietnam, toIsoDay } from '@/lib/vietnam-date';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAY_NAMES = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
const MONTHS = Array.from({ length: 12 }, (_, index) => `Tháng ${index + 1}`);

const selectClass =
  'h-9 rounded-lg border border-stone-200 bg-white px-2 text-sm font-semibold text-stone-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15';

function Calendar({
  value,
  min,
  max,
  allowClear,
  onPick,
  onClose,
}: {
  value: string;
  min: string;
  max: string;
  allowClear: boolean;
  onPick: (value: string) => void;
  onClose: () => void;
}) {
  const today = todayInVietnam();
  const start = parseDay(value) ?? parseDay(today)!;
  const [view, setView] = useState({ year: start.year, month: start.month });
  const selectedRef = useRef<HTMLButtonElement>(null);
  const minYear = Number(min.slice(0, 4));
  const maxYear = Number(max.slice(0, 4));

  useEffect(() => {
    selectedRef.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function shiftMonth(step: number): void {
    setView((current) => {
      const next = new Date(Date.UTC(current.year, current.month + step, 1));
      const year = Math.min(maxYear, Math.max(minYear, next.getUTCFullYear()));
      return { year, month: year === next.getUTCFullYear() ? next.getUTCMonth() : current.month };
    });
  }

  // Six weeks from the Monday on or before the 1st, so the grid never jumps in height.
  const lead = mondayIndex(view.year, view.month, 1);
  const cells = Array.from({ length: 42 }, (_, index) => {
    const iso = toIsoDay({ year: view.year, month: view.month, day: index - lead + 1 });
    return { iso, inMonth: Number(iso.slice(5, 7)) - 1 === view.month };
  });
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index);
  const todayAllowed = today >= min && today <= max;

  return (
    <div className="fixed inset-0 z-[75] grid place-items-center p-4">
      <button
        type="button"
        className="ui-backdrop absolute inset-0 bg-stone-950/40"
        aria-label="Đóng lịch"
        tabIndex={-1}
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Chọn ngày"
        className="ui-dialog relative w-full max-w-[22rem] rounded-2xl bg-white p-4 shadow-2xl"
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="grid size-9 shrink-0 place-items-center rounded-full text-stone-600 hover:bg-stone-100"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <select
            className={cn(selectClass, 'min-w-0 flex-1')}
            value={view.month}
            onChange={(event) => setView({ ...view, month: Number(event.target.value) })}
            aria-label="Tháng"
          >
            {MONTHS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
          <select
            className={cn(selectClass, 'w-[5.5rem] shrink-0')}
            value={view.year}
            onChange={(event) => setView({ ...view, year: Number(event.target.value) })}
            aria-label="Năm"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="grid size-9 shrink-0 place-items-center rounded-full text-stone-600 hover:bg-stone-100"
            aria-label="Tháng sau"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 text-center text-xs font-semibold text-stone-500">
          {WEEKDAYS.map((label, index) => (
            <abbr
              key={label}
              title={WEEKDAY_NAMES[index]}
              className={cn('py-1 no-underline', index === 6 && 'text-red-600')}
            >
              {label}
            </abbr>
          ))}
        </div>
        <div
          className="grid grid-cols-7 gap-0.5"
          role="grid"
          aria-label={`${MONTHS[view.month]} năm ${view.year}`}
        >
          {cells.map(({ iso, inMonth }, index) => {
            const selected = iso === value;
            const disabled = iso < min || iso > max;
            const isToday = iso === today;
            return (
              <button
                key={iso}
                ref={selected ? selectedRef : undefined}
                type="button"
                disabled={disabled}
                onClick={() => onPick(iso)}
                aria-pressed={selected}
                aria-label={formatDay(iso)}
                className={cn(
                  'grid h-10 place-items-center rounded-full text-sm tabular-nums transition',
                  selected
                    ? 'bg-emerald-800 font-semibold text-white'
                    : isToday
                      ? 'font-semibold text-emerald-800 ring-1 ring-emerald-700'
                      : inMonth
                        ? index % 7 === 6
                          ? 'text-red-600 hover:bg-stone-100'
                          : 'text-stone-800 hover:bg-stone-100'
                        : 'text-stone-300 hover:bg-stone-50',
                  disabled && 'cursor-not-allowed opacity-30 hover:bg-transparent',
                )}
              >
                {Number(iso.slice(8, 10))}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 text-sm font-semibold">
          {allowClear ? (
            <button
              type="button"
              onClick={() => onPick('')}
              className="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-100"
            >
              Xóa
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-100"
            >
              Đóng
            </button>
          )}
          <button
            type="button"
            disabled={!todayAllowed}
            onClick={() => onPick(today)}
            className="rounded-lg px-3 py-2 text-emerald-800 hover:bg-emerald-50 disabled:opacity-40"
          >
            Hôm nay
          </button>
        </div>
      </section>
    </div>
  );
}

/**
 * A Vietnamese date field: shows dd/mm/yyyy and opens a Monday-first calendar
 * with month and year menus. The browser's own date picker follows the
 * device's language, which is often English, so it is not used.
 * `value` and `onChange` use `YYYY-MM-DD`, or '' for no date.
 */
export function DatePicker({
  id,
  value,
  onChange,
  min = '1900-01-01',
  max,
  allowClear = false,
  placeholder = 'Chọn ngày',
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  /** Latest selectable day; defaults to the end of next year. */
  max?: string;
  allowClear?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const latest = max ?? `${Number(todayInVietnam().slice(0, 4)) + 1}-12-31`;

  function close(): void {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <span className="relative block">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 text-left text-base tabular-nums outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 sm:text-sm',
            allowClear && value && 'pr-10',
            className,
          )}
        >
          <span className={value ? 'text-stone-900' : 'text-stone-400'}>
            {value ? formatDay(value) : placeholder}
          </span>
          {allowClear && value ? null : (
            <CalendarDays className="size-4 shrink-0 text-stone-500" aria-hidden="true" />
          )}
        </button>
        {allowClear && value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Xóa ngày"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </span>

      <Presence>
        {open ? (
          <Calendar
            value={value}
            min={min}
            max={latest}
            allowClear={allowClear}
            onPick={(next) => {
              onChange(next);
              close();
            }}
            onClose={close}
          />
        ) : null}
      </Presence>
    </>
  );
}
