import { apiFetch } from '@/lib/api-error';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export type FundEntryKind = 'INCOME' | 'EXPENSE';

export type FundEntry = {
  id: string;
  content: string;
  kind: FundEntryKind;
  /** Whole đồng, always positive. */
  amount: number;
  /** The day the money moved, `YYYY-MM-DD`. */
  occurredOn: string;
  createdAt: string;
  updatedAt: string;
};

export type FundLedger = {
  entries: FundEntry[];
  totals: { income: number; expense: number; balance: number };
  canManage: boolean;
};

export type FundEntryInput = {
  content: string;
  kind: FundEntryKind;
  amount: number;
  occurredOn: string;
};

/** Matches the API's cap. */
export const MAX_FUND_AMOUNT = 10_000_000_000_000;

function entriesUrl(slug: string, entryId?: string): string {
  const base = `${API_URL}/families/${encodeURIComponent(slug)}/fund/entries`;
  return entryId ? `${base}/${encodeURIComponent(entryId)}` : base;
}

const JSON_HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };

export function createFundEntry(slug: string, input: FundEntryInput): Promise<FundEntry> {
  return apiFetch(
    entriesUrl(slug),
    { method: 'POST', credentials: 'include', headers: JSON_HEADERS, body: JSON.stringify(input) },
    'ghi khoản thu chi',
  );
}

export function updateFundEntry(
  slug: string,
  entryId: string,
  input: FundEntryInput,
): Promise<FundEntry> {
  return apiFetch(
    entriesUrl(slug, entryId),
    { method: 'PATCH', credentials: 'include', headers: JSON_HEADERS, body: JSON.stringify(input) },
    'sửa khoản thu chi',
  );
}

export function deleteFundEntry(slug: string, entryId: string): Promise<void> {
  return apiFetch(
    entriesUrl(slug, entryId),
    { method: 'DELETE', credentials: 'include', headers: { Accept: 'application/json' } },
    'xóa khoản thu chi',
  );
}
