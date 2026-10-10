export type SuggestionStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';

export type EditSuggestion = {
  id: string;
  person: { id: string; name: string; honorific: string | null };
  proposerName: string;
  content: string;
  status: SuggestionStatus;
  createdAt: string;
  reviewedAt: string | null;
};
