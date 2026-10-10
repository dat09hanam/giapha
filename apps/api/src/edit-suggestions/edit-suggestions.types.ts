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

export type CreatedEditSuggestionResponse = {
  id: string;
  status: SuggestionStatus;
  createdAt: string;
};
