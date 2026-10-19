const STORAGE_KEY = 'giapha_ref';
const KEEP_MS = 60 * 24 * 60 * 60 * 1000;
const CODE = /^[A-Za-z0-9]{4,12}$/;

/** HTML `pattern` matching what the API accepts as an ambassador code. */
export const AMBASSADOR_CODE_PATTERN = '[A-Za-z0-9]{4,12}';

export function normalizeAmbassadorCode(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase().slice(0, 12);
}

/** Keeps the `?ref=` code a visitor arrived with, so a later sign-up form can fill it in. */
export function rememberReferralCode(value: string | null): void {
  const code = normalizeAmbassadorCode(value ?? '');
  if (!CODE.test(code)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    // Storage blocked (private mode): the visitor can still type the code.
  }
}

export function readReferralCode(): string {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return '';
    const stored = JSON.parse(raw) as { code?: unknown; at?: unknown };
    if (typeof stored.code !== 'string' || typeof stored.at !== 'number') return '';
    if (Date.now() - stored.at > KEEP_MS || !CODE.test(stored.code)) return '';
    return stored.code;
  } catch {
    return '';
  }
}
