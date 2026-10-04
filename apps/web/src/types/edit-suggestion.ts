export type SuggestionStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';

/** A change to a person proposed by a family member, as the clan head reviews it. */
export type EditSuggestion = {
  id: string;
  person: { id: string; name: string; honorific: string | null };
  proposerName: string;
  content: string;
  status: SuggestionStatus;
  createdAt: string;
  reviewedAt: string | null;
};
