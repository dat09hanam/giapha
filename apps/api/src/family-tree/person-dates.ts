/** The year in a free-text date such as "1890", "03/1920", "15/06/1950" or "khoảng 1800". */
export function yearOf(value: string | null | undefined): number | null {
  if (!value) return null;
  const text = value.trim().replace(/^khoảng\s+/i, '');
  const iso = /^(\d{4})-\d{2}-\d{2}/.exec(text);
  const dated = /^(?:\d{1,2}[/.-]){1,2}(\d{1,4})$/.exec(text);
  const year =
    iso?.[1] ??
    dated?.[1] ??
    (/^\d{1,4}$/.test(text) ? text : /(?<!\d)(\d{3,4})(?!\d)/.exec(text)?.[1]);
  return year && Number(year) > 0 ? Number(year) : null;
}
