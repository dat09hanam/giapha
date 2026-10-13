import { apiFetch } from '@/lib/api-error';
import type { SiteContact, SiteContactInput } from '@/types/site-contact';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export function updateSiteContact(input: SiteContactInput): Promise<SiteContact> {
  return apiFetch<SiteContact>(
    `${API_URL}/site-contact`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'lưu thông tin liên hệ',
  );
}
