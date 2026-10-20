import { apiFetch } from '@/lib/api-error';
import type { PlanChangeInput, PlanChangeRequest } from '@/types/family-plan';

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
