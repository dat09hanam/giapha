export const PHONE_DIGITS = 10;

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, PHONE_DIGITS);
}

export function formatPhone(value: string): string {
  const digits = phoneDigits(value);
  if (digits.length === 0) return '';
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7)].filter(Boolean).join('.');
}

export function displayPhone(value: string): string {
  return /^0\d{9}$/.test(value) ? formatPhone(value) : value;
}
