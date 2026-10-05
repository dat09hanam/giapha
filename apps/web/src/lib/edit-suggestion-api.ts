import { apiFetch } from '@/lib/api-error';
import type { EditSuggestion, SuggestionStatus } from '@/types/edit-suggestion';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

/** Matches the API's limit on a suggestion's text. */
export const MAX_SUGGESTION_CONTENT_LENGTH = 2000;

export type CreateEditSuggestionInput = {
  proposerName: string;
  content: string;
};

export function createEditSuggestion(
  slug: string,
  personId: string,
  input: CreateEditSuggestionInput,
): Promise<{ id: string; status: SuggestionStatus; createdAt: string }> {
  return apiFetch(
    `${API_URL}/families/${encodeURIComponent(slug)}/people/${encodeURIComponent(personId)}/suggestions`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'gửi đề xuất',
  );
}

export function updateEditSuggestionStatus(
  slug: string,
  suggestionId: string,
  status: SuggestionStatus,
): Promise<EditSuggestion> {
  return apiFetch<EditSuggestion>(
    `${API_URL}/families/${encodeURIComponent(slug)}/suggestions/${encodeURIComponent(suggestionId)}`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
    'cập nhật đề xuất',
  );
}
