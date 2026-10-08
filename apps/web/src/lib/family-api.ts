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
  deathAnniversary: string;
  /** Where the clan head's forgotten-password code is sent; the sample family has none. */
  headEmail?: string;
  /** Quê quán / nguồn gốc; appended to the path when name and anniversary are already taken. */
  ancestryOrigin?: string;
};

/** Only the sample family's path is chosen here; the API derives every other Family's. */
export type CreateDemoFamilyInput = CreateFamilyInput & { slug: string };

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

/** The slug a new Family would get; `withOrigin` when its name and anniversary were already taken. */
export type FamilySlugCheck = { slug: string; available: boolean; withOrigin: boolean };

/** Asks the API which path `createFamily` would choose, so the form can flag a clash early. */
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

/** Creates Gia phả mẫu; refused while one already exists. */
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
