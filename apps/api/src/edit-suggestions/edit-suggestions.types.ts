import type { SuggestionStatus } from '@prisma/client';

export type EditSuggestionResponse = {
  id: string;
  person: { id: string; name: string; honorific: string | null };
  proposerName: string;
  content: string;
  status: SuggestionStatus;
  createdAt: string;
  reviewedAt: string | null;
};

/** What the proposer gets back: enough to confirm, nothing from other suggestions. */
export type CreatedEditSuggestionResponse = {
  id: string;
  status: SuggestionStatus;
  createdAt: string;
};
