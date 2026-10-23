import { apiFetch } from '@/lib/api-error';
import type {
  Ambassador,
  AmbassadorCommission,
  AmbassadorSignupInput,
  AmbassadorSignupResult,
  AmbassadorStatus,
} from '@/types/ambassador';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

const JSON_HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };

export function registerAmbassador(input: AmbassadorSignupInput): Promise<AmbassadorSignupResult> {
  return apiFetch<AmbassadorSignupResult>(
    `${API_URL}/ambassadors`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(input) },
    'đăng ký đại sứ',
  );
}

export function updateAmbassador(
  id: string,
  change: { status?: AmbassadorStatus; adminNote?: string | null },
): Promise<Ambassador> {
  return apiFetch<Ambassador>(
    `${API_URL}/ambassadors/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: JSON_HEADERS,
      body: JSON.stringify(change),
    },
    'cập nhật đại sứ',
  );
}

export function resendAmbassadorWelcome(id: string): Promise<void> {
  return apiFetch<void>(
    `${API_URL}/ambassadors/${encodeURIComponent(id)}/welcome-email`,
    { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' } },
    'gửi lại email',
  );
}

export function deleteAmbassador(id: string): Promise<void> {
  return apiFetch<void>(
    `${API_URL}/ambassadors/${encodeURIComponent(id)}`,
    { method: 'DELETE', credentials: 'include', headers: { Accept: 'application/json' } },
    'xóa đại sứ',
  );
}

/** Records that the admin transferred these commissions; returns them as now stored. */
export function markCommissionsPaid(ids: string[], note?: string): Promise<AmbassadorCommission[]> {
  return apiFetch<AmbassadorCommission[]>(
    `${API_URL}/ambassadors/commissions/pay`,
    {
      method: 'POST',
      credentials: 'include',
      headers: JSON_HEADERS,
      body: JSON.stringify({ ids, note: note?.trim() || undefined }),
    },
    'ghi nhận chi trả',
  );
}
