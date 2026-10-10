import { apiFetch } from '@/lib/api-error';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export type MeritDonationKind = 'CASH' | 'ITEM';

export type MeritTotals = {
  cashAmount: number;
  cashCount: number;
  itemCount: number;
};

export type MeritEvent = {
  id: string;
  title: string;
  description: string | null;
  heldOn: string | null;
  createdAt: string;
  updatedAt: string;
  totals: MeritTotals;
};

export type MeritDonation = {
  id: string;
  eventId: string;
  donorName: string;
  kind: MeritDonationKind;
  amount: number | null;
  itemContent: string | null;
  note: string | null;
  donatedOn: string;
  createdAt: string;
  updatedAt: string;
};

export type MeritOverview = {
  events: MeritEvent[];
  canManage: boolean;
};

export type MeritEventDetail = {
  event: MeritEvent;
  donations: MeritDonation[];
  canManage: boolean;
};

export type MeritEventInput = {
  title: string;
  description: string | null;
  heldOn: string | null;
};

export type MeritDonationInput = {
  donorName: string;
  kind: MeritDonationKind;
  amount: number | null;
  itemContent: string | null;
  note: string | null;
  donatedOn: string;
};

export const MAX_MERIT_AMOUNT = 10_000_000_000_000;

const JSON_HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };

function meritUrl(slug: string, path: string): string {
  return `${API_URL}/families/${encodeURIComponent(slug)}/merit/${path}`;
}

export function createMeritEvent(slug: string, input: MeritEventInput): Promise<MeritEvent> {
  return apiFetch(
    meritUrl(slug, 'events'),
    { method: 'POST', credentials: 'include', headers: JSON_HEADERS, body: JSON.stringify(input) },
    'tạo sự kiện công đức',
  );
}

export function updateMeritEvent(
  slug: string,
  eventId: string,
  input: MeritEventInput,
): Promise<MeritEvent> {
  return apiFetch(
    meritUrl(slug, `events/${encodeURIComponent(eventId)}`),
    { method: 'PATCH', credentials: 'include', headers: JSON_HEADERS, body: JSON.stringify(input) },
    'sửa sự kiện công đức',
  );
}

export function deleteMeritEvent(slug: string, eventId: string): Promise<void> {
  return apiFetch(
    meritUrl(slug, `events/${encodeURIComponent(eventId)}`),
    { method: 'DELETE', credentials: 'include', headers: { Accept: 'application/json' } },
    'xóa sự kiện công đức',
  );
}

export function createMeritDonation(
  slug: string,
  eventId: string,
  input: MeritDonationInput,
): Promise<MeritDonation> {
  return apiFetch(
    meritUrl(slug, `events/${encodeURIComponent(eventId)}/donations`),
    { method: 'POST', credentials: 'include', headers: JSON_HEADERS, body: JSON.stringify(input) },
    'ghi công đức',
  );
}

export function updateMeritDonation(
  slug: string,
  donationId: string,
  input: MeritDonationInput,
): Promise<MeritDonation> {
  return apiFetch(
    meritUrl(slug, `donations/${encodeURIComponent(donationId)}`),
    { method: 'PATCH', credentials: 'include', headers: JSON_HEADERS, body: JSON.stringify(input) },
    'sửa lượt công đức',
  );
}

export function deleteMeritDonation(slug: string, donationId: string): Promise<void> {
  return apiFetch(
    meritUrl(slug, `donations/${encodeURIComponent(donationId)}`),
    { method: 'DELETE', credentials: 'include', headers: { Accept: 'application/json' } },
    'xóa lượt công đức',
  );
}
