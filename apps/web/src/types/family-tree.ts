export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';

export type FamilySummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  ancestryOrigin: string | null;
};

export type Person = {
  id: string;
  name: string;
  nickname: string | null;
  gender: Gender;
  birthDate: string | null;
  deathDate: string | null;
  isAlive: boolean;
  avatarUrl: string | null;
  generation: number | null;
  orderInFamily: number | null;
  fatherId: string | null;
  motherId: string | null;
};

export type FamilyTreeResponse = {
  family: FamilySummary;
  people: Person[];
};
