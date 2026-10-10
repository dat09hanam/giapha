type DateParts = { year: number; month: number | null; day: number | null };

function partsOf(value: string | null | undefined): DateParts | null {
  if (!value) return null;
  const text = value.trim().replace(/^khoảng\s+/i, '');
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
  const dayMonthYear = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{1,4})$/.exec(text);
  if (dayMonthYear) {
    return {
      year: Number(dayMonthYear[3]),
      month: Number(dayMonthYear[2]),
      day: Number(dayMonthYear[1]),
    };
  }
  const monthYear = /^(\d{1,2})[/.-](\d{1,4})$/.exec(text);
  if (monthYear) return { year: Number(monthYear[2]), month: Number(monthYear[1]), day: null };
  const year = /^\d{1,4}$/.test(text) ? text : /(?<!\d)(\d{3,4})(?!\d)/.exec(text)?.[1];
  return year && Number(year) > 0 ? { year: Number(year), month: null, day: null } : null;
}

export function yearOf(value: string | null | undefined): number | null {
  return partsOf(value)?.year ?? null;
}

export function sortKeyOf(value: string | null | undefined): string | null {
  const parts = partsOf(value);
  if (!parts) return null;
  const pad = (part: number, length = 2): string => String(part).padStart(length, '0');
  return [
    pad(parts.year, 4),
    ...(parts.month === null ? [] : [pad(parts.month)]),
    ...(parts.day === null || parts.month === null ? [] : [pad(parts.day)]),
  ].join('-');
}

export function compareDates(
  a: string | null | undefined,
  b: string | null | undefined,
): number | null {
  const left = sortKeyOf(a);
  const right = sortKeyOf(b);
  if (!left || !right) return null;
  if (left.slice(0, 4) !== right.slice(0, 4)) return left < right ? -1 : 1;
  if (left.length !== right.length || left === right) return null;
  return left < right ? -1 : 1;
}

export function formatPartialDate(value: string | null | undefined): string {
  if (!value) return '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : value;
}

export type PartialDate = {
  year: number | null;
  month: number | null;
  day: number | null;
  approximate: boolean;
};

export function parsePartialDate(value: string | null | undefined): PartialDate {
  const key = sortKeyOf(value);
  const [year, month, day] = (key ?? '').split('-').map((part) => (part ? Number(part) : null));
  return {
    year: year ?? null,
    month: month ?? null,
    day: day ?? null,
    approximate: /khoảng/i.test(value ?? ''),
  };
}

export function composePartialDate({ year, month, day, approximate }: PartialDate): string {
  if (year === null) return '';
  const pad = (part: number): string => String(part).padStart(2, '0');
  const date =
    month === null
      ? String(year)
      : day === null
        ? `${pad(month)}/${year}`
        : `${pad(day)}/${pad(month)}/${year}`;
  return approximate ? `khoảng ${date}` : date;
}

export function daysInMonth(year: number, month: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month, 0);
  return date.getUTCDate();
}
