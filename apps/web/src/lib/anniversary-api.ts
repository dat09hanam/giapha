import { apiFetch } from '@/lib/api-error';
import type { Gender } from '@/types/family-tree';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export type AnniversaryEntry = {
  personId: string;
  name: string;
  honorific: string | null;
  gender: Gender;
  generation: number | null;
  avatarUrl: string | null;
  lunarDay: number;
  lunarMonth: number;
  /** ISO solar day of this occurrence. */
  date: string;
  /** Which anniversary this is (1 = giỗ đầu), when the year of death is known. */
  anniversaryNumber: number | null;
};

export type AnniversaryReminder = { id: string; personId: string; email: string };

/** A new reminder; `sentNow` when the anniversary is within a week and its email already went out. */
export type CreatedAnniversaryReminder = AnniversaryReminder & {
  sentNow: boolean;
  daysLeft: number;
};

export type AnniversaryCalendar = {
  year: number;
  today: string;
  familyName: string;
  familyAnniversary: { lunarDay: number; lunarMonth: number; dates: string[] } | null;
  lunarMonths: Array<{ date: string; lunarMonth: number; lunarYear: number; leap: boolean }>;
  anniversaries: AnniversaryEntry[];
  reminders: AnniversaryReminder[];
  accountEmail: string | null;
  mailEnabled: boolean;
};

function baseUrl(slug: string): string {
  return `${API_URL}/families/${encodeURIComponent(slug)}/anniversaries`;
}

const JSON_HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };

export function fetchAnniversaryCalendar(slug: string, year: number): Promise<AnniversaryCalendar> {
  return apiFetch<AnniversaryCalendar>(
    `${baseUrl(slug)}?year=${year}`,
    { credentials: 'include', headers: { Accept: 'application/json' }, cache: 'no-store' },
    'tải lịch giỗ',
  );
}

export function createAnniversaryReminder(
  slug: string,
  input: { personId: string; email: string },
): Promise<CreatedAnniversaryReminder> {
  return apiFetch<CreatedAnniversaryReminder>(
    `${baseUrl(slug)}/reminders`,
    { method: 'POST', credentials: 'include', headers: JSON_HEADERS, body: JSON.stringify(input) },
    'đặt nhắc lịch giỗ',
  );
}

export function deleteAnniversaryReminder(slug: string, reminderId: string): Promise<void> {
  return apiFetch<void>(
    `${baseUrl(slug)}/reminders/${encodeURIComponent(reminderId)}`,
    { method: 'DELETE', credentials: 'include' },
    'hủy nhắc lịch giỗ',
  );
}

export function unsubscribeAnniversaryReminder(
  token: string,
): Promise<{ personName: string; familyName: string }> {
  return apiFetch(
    `${API_URL}/anniversary-reminders/unsubscribe`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ token }) },
    'hủy nhắc lịch giỗ',
  );
}
