import { apiFetch } from '@/lib/api-error';
import type { FamilyDetails } from '@/types/family-tree';
import type { RichTextDocument } from '@/types/rich-text';

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

export type CreatedDemoFamilyResult = {
  family: CreatedFamilyResult['family'];
  accounts: null;
};

export type CreateFamilyInput = {
  name: string;
  deathAnniversary: string;
  headEmail?: string;
  ancestryOrigin?: string;
};

export type CreateDemoFamilyInput = CreateFamilyInput & { slug: string };

export type UpdateFamilyInput = Partial<{
  name: string;
  description: string;
  introduction: RichTextDocument | null;
  address: string;
  ancestryOrigin: string;
  deathAnniversary: string | null;
  posterBackgroundId: string | null;
  posterLeftText: string | null;
  posterRightText: string | null;
}>;

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

export type FamilySlugCheck = { slug: string; available: boolean; withOrigin: boolean };

export function checkFamilySlug(
  input: CreateFamilyInput,
  signal: AbortSignal,
): Promise<FamilySlugCheck> {
  const query = new URLSearchParams({ name: input.name, deathAnniversary: input.deathAnniversary });
  if (input.ancestryOrigin) query.set('ancestryOrigin', input.ancestryOrigin);
  return apiFetch<FamilySlugCheck>(
    `${API_URL}/families/slug-check?${query.toString()}`,
    { credentials: 'include', headers: { Accept: 'application/json' }, signal },
    'kiểm tra đường dẫn',
  );
}

export function createDemoFamily(input: CreateDemoFamilyInput): Promise<CreatedDemoFamilyResult> {
  return apiFetch<CreatedDemoFamilyResult>(
    `${API_URL}/families`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, isDemo: true }),
    },
    'tạo gia phả mẫu',
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
