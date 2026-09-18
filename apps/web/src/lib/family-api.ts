import { apiFetch } from '@/lib/api-error';
import type { FamilyDetails } from '@/types/family-tree';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export type CreatedFamilyResult = {
  family: {
    id: string;
    name: string;
    slug: string;
    deathAnniversary: string;
  };
  accounts: {
    memberPlus: { role: 'MEMBER_PLUS'; username: string; password: string };
    member: { role: 'MEMBER'; username: string; password: string };
  };
};

export type CreateFamilyInput = {
  name: string;
  slug: string;
  deathAnniversary: string;
};

export type UpdateFamilyInput = {
  name: string;
  description: string;
  address: string;
  ancestryOrigin: string;
  deathAnniversary: string | null;
};

export function createFamily(input: CreateFamilyInput): Promise<CreatedFamilyResult> {
  return apiFetch<CreatedFamilyResult>(
    `${API_URL}/families`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'tạo dòng họ',
  );
}

export function updateFamily(slug: string, input: UpdateFamilyInput): Promise<FamilyDetails> {
  return apiFetch<FamilyDetails>(
    `${API_URL}/families/${encodeURIComponent(slug)}`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'cập nhật thông tin dòng họ',
  );
}
