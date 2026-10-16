export const PHONE_DIGITS = 10;

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, PHONE_DIGITS);
}

export function formatPhone(value: string): string {
  const digits = phoneDigits(value);
  if (digits.length === 0) return '';
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7)].filter(Boolean).join('.');
}

/**
 * Shows a stored number as `0963.966.405`. Older entries typed with spaces or dashes are
 * reformatted too; anything that is not a 10-digit number starting with 0 is shown as typed.
 */
export function displayPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return /^0\d{9}$/.test(digits) ? formatPhone(digits) : value.trim();
}

/**
 * What a phone field sends to the API: the bare digits of a 10-digit number, an older free-form
 * entry as typed, or null when the field is empty.
 */
export function phoneOrNull(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (/^0\d{9}$/.test(digits)) return digits;
  return value.trim() || null;
}
