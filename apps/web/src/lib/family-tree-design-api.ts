import { apiFetch } from '@/lib/api-error';
import type { Gender } from '@/types/family-tree';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export type FamilyTreeDesignSaveInput = {
  people: Array<{
    clientId: string;
    databaseId: string | null;
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
    generation: number;
    orderInFamily: number;
    fatherClientId: string | null;
    motherClientId: string | null;
  }>;
  relationships: Array<{
    husbandClientId: string;
    wifeClientId: string;
    wifeOrder: number;
  }>;
  deletedPersonIds: string[];
};

export type FamilyTreeDesignSaveResult = {
  savedPeople: Array<{
    clientId: string;
    databaseId: string;
  }>;
  savedRelationshipCount: number;
  deletedPersonCount: number;
};

export function saveFamilyTreeDesign(
  slug: string,
  input: FamilyTreeDesignSaveInput,
): Promise<FamilyTreeDesignSaveResult> {
  return apiFetch<FamilyTreeDesignSaveResult>(
    API_URL + '/families/' + encodeURIComponent(slug) + '/tree/design',
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
    'lưu toàn bộ gia phả',
  );
}
