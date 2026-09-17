import type { Gender } from '@prisma/client';

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
  }>;
};

export type PersonResponse = {
  id: string;
  familyId: string;
  fatherId: string | null;
  motherId: string | null;
  name: string;
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
