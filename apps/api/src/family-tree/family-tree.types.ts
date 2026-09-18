import type { Gender, RelationshipStatus } from "@prisma/client";

export type FamilyTreeResponse = {
  family: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    address: string | null;
    ancestryOrigin: string | null;
  };
  people: Array<{
    id: string;
    name: string;
    honorific: string | null;
    nickname: string | null;
    courtesyName: string | null;
    gender: Gender;
    birthDate: string | null;
    deathDate: string | null;
    lunarDeathDay: number | null;
    lunarDeathMonth: number | null;
    isAlive: boolean;
    burialPlace: string | null;
    phone: string | null;
    avatarUrl: string | null;
    biography: string | null;
    generation: number | null;
    orderInFamily: number | null;
    fatherId: string | null;
    motherId: string | null;
  }>;
  relationships: Array<{
    id: string;
    husbandId: string;
    wifeId: string;
    status: RelationshipStatus;
    wifeOrder: number | null;
  }>;
};

export type PersonResponse = {
  id: string;
  familyId: string;
  fatherId: string | null;
  motherId: string | null;
  name: string;
  honorific: string | null;
  nickname: string | null;
  courtesyName: string | null;
  gender: Gender;
  birthDate: string | null;
  deathDate: string | null;
  lunarDeathDay: number | null;
  lunarDeathMonth: number | null;
  isAlive: boolean;
  burialPlace: string | null;
  phone: string | null;
  avatarUrl: string | null;
  biography: string | null;
  generation: number | null;
  orderInFamily: number | null;
};

export type SaveFamilyTreeDesignResponse = {
  savedPeople: Array<{
    clientId: string;
    databaseId: string;
  }>;
  savedRelationshipCount: number;
  deletedPersonCount: number;
};
