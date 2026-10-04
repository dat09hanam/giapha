import { apiFetch } from '@/lib/api-error';
import type { FamilyFeatures } from '@/types/family-tree';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

/** Switches family sections on or off for the whole platform; platform admin only. */
export function updatePlatformFeatures(change: Partial<FamilyFeatures>): Promise<FamilyFeatures> {
  return apiFetch<FamilyFeatures>(
    `${API_URL}/platform-features`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(change),
    },
    'cập nhật chức năng',
  );
}
