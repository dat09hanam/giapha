import { apiFetch } from '@/lib/api-error';
import type {
  PricingPlan,
  PricingPlanInput,
  ServiceRegistration,
  ServiceRegistrationInput,
  ServiceRegistrationStatus,
} from '@/types/pricing';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

const JSON_HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };

export function createPricingPlan(input: PricingPlanInput): Promise<PricingPlan> {
  return apiFetch<PricingPlan>(
    `${API_URL}/pricing-plans`,
    { method: 'POST', credentials: 'include', headers: JSON_HEADERS, body: JSON.stringify(input) },
    'thêm gói dịch vụ',
  );
}

export function updatePricingPlan(id: string, input: PricingPlanInput): Promise<PricingPlan> {
  return apiFetch<PricingPlan>(
    `${API_URL}/pricing-plans/${encodeURIComponent(id)}`,
    { method: 'PATCH', credentials: 'include', headers: JSON_HEADERS, body: JSON.stringify(input) },
    'lưu gói dịch vụ',
  );
}

export function deletePricingPlan(id: string): Promise<void> {
  return apiFetch<void>(
    `${API_URL}/pricing-plans/${encodeURIComponent(id)}`,
    { method: 'DELETE', credentials: 'include', headers: { Accept: 'application/json' } },
    'xóa gói dịch vụ',
  );
}

export function submitServiceRegistration(input: ServiceRegistrationInput): Promise<void> {
  return apiFetch<void>(
    `${API_URL}/service-registrations`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(input) },
    'gửi đăng ký',
  );
}

export function updateServiceRegistration(
  id: string,
  change: { status?: ServiceRegistrationStatus; adminNote?: string | null },
): Promise<ServiceRegistration> {
  return apiFetch<ServiceRegistration>(
    `${API_URL}/service-registrations/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: JSON_HEADERS,
      body: JSON.stringify(change),
    },
    'cập nhật đăng ký',
  );
}

export function deleteServiceRegistration(id: string): Promise<void> {
  return apiFetch<void>(
    `${API_URL}/service-registrations/${encodeURIComponent(id)}`,
    { method: 'DELETE', credentials: 'include', headers: { Accept: 'application/json' } },
    'xóa đăng ký',
  );
}
