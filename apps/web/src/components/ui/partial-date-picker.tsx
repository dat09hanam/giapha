'use client';

import { CalendarDays, X } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Presence } from '@/components/ui/presence';
import { SheetDialog } from '@/components/ui/sheet-dialog';

import {
  composePartialDate,
  daysInMonth,
  formatPartialDate,
  parsePartialDate,
} from '@/lib/partial-date';
import { cn } from '@/lib/utils';
import { todayInVietnam } from '@/lib/vietnam-date';

type Fields = { day: string; month: string; year: string; approximate: boolean };

function fieldsOf(value: string): Fields {
  const parts = parsePartialDate(value);
  return {
    day: parts.day?.toString() ?? '',
    month: parts.month?.toString() ?? '',
    year: parts.year?.toString() ?? '',
    approximate: parts.approximate,
  };
}

function resolve(fields: Fields): { value: string; problem: string | null } {
  const latestYear = Number(todayInVietnam().slice(0, 4));
  const year = fields.year ? Number(fields.year) : null;
  let month = fields.month ? Number(fields.month) : null;
  let day = fields.day ? Number(fields.day) : null;
  let problem: string | null = null;

  if (year === null) {
    if (month !== null || day !== null) problem = 'Nhập năm để lưu ngày và tháng.';
    return { value: '', problem };
  }
  if (year < 1) return { value: '', problem: 'Năm phải lớn hơn 0.' };
  if (year > latestYear) {
    return { value: '', problem: `Năm không được sau năm ${latestYear}.` };
  }
  if (month !== null && (month < 1 || month > 12)) {
    problem = 'Tháng từ 1 đến 12.';
    month = null;
    day = null;
  }
  if (month === null && day !== null) {
    problem ??= 'Nhập tháng để lưu ngày.';
    day = null;
  }
  if (month !== null && day !== null && (day < 1 || day > daysInMonth(year, month))) {
    problem = `Tháng ${month}/${year} có ${daysInMonth(year, month)} ngày.`;
    day = null;
  }
  return {
    value: composePartialDate({ year, month, day, approximate: fields.approximate }),
    problem,
  };
}

const boxClass =
  'h-12 w-full min-w-0 rounded-xl border border-stone-200 bg-white px-3 text-center text-lg font-semibold tabular-nums outline-none transition placeholder:font-normal placeholder:text-stone-300 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15';

const BOXES = [
  { key: 'day', label: 'Ngày', length: 2 },
  { key: 'month', label: 'Tháng', length: 2 },
  { key: 'year', label: 'Năm', length: 4 },
] as const;

function PartialDateDialog({
  title,
  value,
  onDone,
  onClose,
}: {
  title: string;
  value: string;
  onDone: (value: string) => void;
  onClose: () => void;
}) {
  const baseId = useId();
  const [fields, setFields] = useState<Fields>(() => fieldsOf(value));
  const { value: result, problem } = resolve(fields);
  const unreadable = Boolean(value.trim()) && parsePartialDate(value).year === null;
  const hasInput = Boolean(fields.day || fields.month || fields.year);

  function done(): void {
    if (!problem) onDone(result);
  }

  function onEnter(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      done();
    }
  }

  return (
    <SheetDialog
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onDone('')}>
            Xóa {title.toLowerCase()}
          </Button>
          <Button type="button" onClick={done} disabled={Boolean(problem)}>
            Xong
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2">
        {BOXES.map((box) => (
          <input
            key={box.key}
            aria-label={box.label}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoFocus={box.key === 'year'}
            maxLength={box.length}
            placeholder={box.label}
            value={fields[box.key]}
            onChange={(event) =>
              setFields({
                ...fields,
                [box.key]: event.currentTarget.value.replace(/\D/g, '').slice(0, box.length),
              })
            }
            onKeyDown={onEnter}
            className={boxClass}
          />
        ))}
      </div>

      <label
        className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border bg-white px-3 text-sm text-brand-950 transition hover:border-brand-800/35"
        htmlFor={`${baseId}-approximate`}
      >
        <input
          id={`${baseId}-approximate`}
          type="checkbox"
          checked={fields.approximate}
          onChange={(event) => setFields({ ...fields, approximate: event.currentTarget.checked })}
          className="size-4 accent-brand-700"
        />
        <span className="font-medium">Ước chừng</span>
        {fields.approximate && result ? (
          <span className="font-semibold text-wood-800" aria-live="polite">
            {result.replace(/^khoảng/, 'Khoảng')}
          </span>
        ) : (
          <span className="text-stone-500">— ghi là “khoảng …”</span>
        )}
      </label>

      {problem || !hasInput ? (
        <p
          className="rounded-xl bg-paper-deep/40 px-3 py-2.5 text-center text-sm"
          aria-live="polite"
        >
          {problem ? (
            <span className="text-amber-700">{problem}</span>
          ) : unreadable ? (
            <span className="text-stone-500">Đang ghi “{value}”. Nhập số để thay.</span>
          ) : (
            <span className="text-stone-500">
              Không nhớ đủ thì chỉ cần nhập năm, hoặc tháng và năm.
            </span>
          )}
        </p>
      ) : null}
    </SheetDialog>
  );
}

export function PartialDatePicker({
  id,
  title,
  value,
  onChange,
  placeholder = 'Chưa rõ',
  className,
}: {
  id?: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const shown = formatPartialDate(value);

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
            'flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 text-left text-base tabular-nums outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm',
            value && 'pr-10',
            className,
          )}
        >
          <span className={cn('truncate', value ? 'text-stone-900' : 'text-stone-400')}>
            {shown || placeholder}
          </span>
          {value ? null : (
            <CalendarDays className="size-4 shrink-0 text-stone-500" aria-hidden="true" />
          )}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label={`Xóa ${title.toLowerCase()}`}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </span>

      <Presence>
        {open ? (
          <PartialDateDialog
            title={title}
            value={value}
            onDone={(next) => {
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
