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

/** The sample family comes without accounts: the platform admin edits it directly. */
export type CreatedDemoFamilyResult = {
  family: CreatedFamilyResult['family'];
  accounts: null;
};

export type CreateFamilyInput = {
  name: string;
  slug: string;
  deathAnniversary: string;
};

/** Fields left out are not changed, so each admin form sends only its own. */
export type UpdateFamilyInput = Partial<{
  name: string;
  description: string;
  /** Replaces `description`, which the API derives from it; null clears both. */
  introduction: RichTextDocument | null;
  address: string;
  ancestryOrigin: string;
  deathAnniversary: string | null;
  /** Library background ID; null shows plain paper. */
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

/** Creates Gia phả mẫu; refused while one already exists. */
export function createDemoFamily(input: CreateFamilyInput): Promise<CreatedDemoFamilyResult> {
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
