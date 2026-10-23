import { apiFetch } from '@/lib/api-error';
import type { FamilyImportInput, FamilyImportResult } from '@/types/family-import';
import type { FamilyTreeResponse } from '@/types/family-tree';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

/** Checks (dryRun) or imports spreadsheet rows; the API writes nothing while issues remain. */
export function importFamilyTree(
  slug: string,
  input: FamilyImportInput,
): Promise<FamilyImportResult> {
  return apiFetch<FamilyImportResult>(
    API_URL + '/families/' + encodeURIComponent(slug) + '/import',
    {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    input.dryRun ? 'kiểm tra file nhập liệu' : 'nhập dữ liệu gia phả',
  );
}

/** The stored tree, fetched in the browser only when the clan head downloads the member list. */
export function getFamilyTreeForExport(slug: string): Promise<FamilyTreeResponse> {
  return apiFetch<FamilyTreeResponse>(
    API_URL + '/families/' + encodeURIComponent(slug) + '/tree',
    { credentials: 'include', headers: { Accept: 'application/json' }, cache: 'no-store' },
    'tải danh sách thành viên',
  );
}
