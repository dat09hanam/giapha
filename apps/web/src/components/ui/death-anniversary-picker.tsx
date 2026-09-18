'use client';

import { ChevronDown } from 'lucide-react';

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

type DeathAnniversaryPickerProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Overrides the legend so the picker can also label a person's giỗ. */
  label?: string;
  /** Lunar months never exceed 30 days; solar anniversaries keep the default. */
  maxDayInMonth?: number;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
};

function parseValue(value: string): { day: number | null; month: number | null } {
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

export function DeathAnniversaryPicker({
  id,
  value,
  onChange,
  label = 'Ngày giỗ họ',
  maxDayInMonth = 31,
  hint,
  required = false,
  disabled = false,
}: DeathAnniversaryPickerProps) {
  const { day, month } = parseValue(value);
  const maximumDay = Math.min(month === null ? 31 : DAYS_IN_MONTH[month - 1]!, maxDayInMonth);

  function selectDay(rawDay: string): void {
    if (!rawDay) {
      onChange('');
      return;
    }

    onChange(formatValue(Number(rawDay), month ?? 1));
  }

  function selectMonth(rawMonth: string): void {
    if (!rawMonth) {
      onChange('');
      return;
    }

    const nextMonth = Number(rawMonth);
    const nextDay = Math.min(day ?? 1, DAYS_IN_MONTH[nextMonth - 1]!, maxDayInMonth);
    onChange(formatValue(nextDay, nextMonth));
  }

  const hintId = hint ? `${id}-hint` : undefined;
  const selectClassName =
    'h-11 w-full appearance-none rounded-xl border bg-white px-3 pr-10 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500';

  return (
    <fieldset className="grid gap-1.5" aria-describedby={hintId}>
      <legend className="text-sm font-medium text-emerald-950">{label}</legend>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1" htmlFor={`${id}-day`}>
          <span className="text-xs text-stone-500">Ngày</span>
          <span className="relative">
            <select
              id={`${id}-day`}
              value={day ?? ''}
              onChange={(event) => selectDay(event.currentTarget.value)}
              className={selectClassName}
              required={required}
              disabled={disabled}
              aria-label={`Chọn ngày - ${label}`}
            >
              <option value="">Chọn ngày</option>
              {Array.from({ length: maximumDay }, (_, index) => index + 1).map((optionDay) => (
                <option key={optionDay} value={optionDay}>
                  {String(optionDay).padStart(2, '0')}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-stone-500"
              aria-hidden="true"
            />
          </span>
        </label>

        <label className="grid gap-1" htmlFor={`${id}-month`}>
          <span className="text-xs text-stone-500">Tháng</span>
          <span className="relative">
            <select
              id={`${id}-month`}
              value={month ?? ''}
              onChange={(event) => selectMonth(event.currentTarget.value)}
              className={selectClassName}
              required={required}
              disabled={disabled}
              aria-label={`Chọn tháng - ${label}`}
            >
              <option value="">Chọn tháng</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((optionMonth) => (
                <option key={optionMonth} value={optionMonth}>
                  Tháng {String(optionMonth).padStart(2, '0')}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-stone-500"
              aria-hidden="true"
            />
          </span>
        </label>
      </div>
      {hint ? (
        <span id={hintId} className="text-xs text-stone-500">
          {hint}
        </span>
      ) : null}
    </fieldset>
  );
}
