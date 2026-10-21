import { apiFetch } from '@/lib/api-error';
import type { PlanChangeInput, PlanChangeRequest, PlanRenewal } from '@/types/family-plan';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

/** Sends the clan head's plan change request; the admin follows up and changes the plan. */
export function requestPlanChange(
  familySlug: string,
  input: PlanChangeInput,
): Promise<PlanChangeRequest> {
  return apiFetch<PlanChangeRequest>(
    `${API_URL}/families/${encodeURIComponent(familySlug)}/plan/requests`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'gửi yêu cầu thay đổi gói',
  );
}

/** Issues (or hands back) the transfer that renews the plan for one more period. */
export function createPlanRenewal(familySlug: string): Promise<PlanRenewal> {
  return apiFetch<PlanRenewal>(
    `${API_URL}/families/${encodeURIComponent(familySlug)}/plan/renewals`,
    { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' } },
    'tạo mã thanh toán gia hạn',
  );
}

export function getPlanRenewal(familySlug: string, paymentId: string): Promise<PlanRenewal> {
  return apiFetch<PlanRenewal>(
    `${API_URL}/families/${encodeURIComponent(familySlug)}/plan/renewals/${encodeURIComponent(paymentId)}`,
    { credentials: 'include', headers: { Accept: 'application/json' }, cache: 'no-store' },
    'kiểm tra thanh toán',
  );
}
