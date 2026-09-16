export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';

export type FamilySummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export type Person = {
  id: string;
  displayName: string;
  gender: Gender;
  birthDate: string | null;
  deathDate: string | null;
  avatarUrl: string | null;
  generation: number | null;
  fatherId: string | null;
  motherId: string | null;
};

export type FamilyTreeResponse = {
  family: FamilySummary;
  people: Person[];
};
