import type { FamilyPoster } from '@/lib/poster-decorations';
import type { RichTextDocument } from '@/types/rich-text';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';

export type FamilySummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  introduction: RichTextDocument | null;
  address: string | null;
  ancestryOrigin: string | null;
};

export type FamilyFeature = 'feed' | 'fund' | 'merit' | 'library' | 'editSuggestions' | 'printBook';

export type FamilyFeatures = Record<FamilyFeature, boolean>;

/** Counts shown on the family home; no personal details. */
export type FamilyStats = {
  members: number;
  male: number;
  female: number;
  living: number;
  deceased: number;
  generations: number;
  firstGeneration: number | null;
  lastGeneration: number | null;
  couples: number;
  updatedAt: string | null;
};

export type FamilyDetails = FamilySummary & {
  deathAnniversaryDay: number | null;
  deathAnniversaryMonth: number | null;
  poster: FamilyPoster;
};

export type Person = {
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
  maritalStatus: MaritalStatus | null;
  education: string | null;
  occupation: string | null;
  hometown: string | null;
  currentAddress: string | null;
  mapUrl: string | null;
  ageAtDeath: number | null;
  worshipPlace: string | null;
  worshipKeeperId: string | null;
  deathAnniversaryText: string | null;
};

export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';

export type FamilyTreeRelationship = {
  id: string;
  husbandId: string;
  wifeId: string;
  status: 'MARRIED' | 'SEPARATED' | 'DIVORCED' | 'WIDOWED';
  wifeOrder: number | null;
};

export type FamilyTreeResponse = {
  family: FamilySummary;
  people: Person[];
  relationships: FamilyTreeRelationship[];
};
