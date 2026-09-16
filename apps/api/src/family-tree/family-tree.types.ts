import type { Gender } from '@prisma/client';

export type FamilyTreeResponse = {
  family: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
  };
  people: Array<{
    id: string;
    displayName: string;
    gender: Gender;
    birthDate: string | null;
    deathDate: string | null;
    avatarUrl: string | null;
    generation: number | null;
    fatherId: string | null;
    motherId: string | null;
  }>;
};

export type PersonResponse = {
  id: string;
  familyId: string;
  fatherId: string | null;
  motherId: string | null;
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  gender: Gender;
  birthDate: string | null;
  deathDate: string | null;
  avatarUrl: string | null;
  biography: string | null;
  generation: number | null;
};
