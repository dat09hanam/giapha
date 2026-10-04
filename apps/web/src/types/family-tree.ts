import type { FamilyPoster } from "@/lib/poster-decorations";

export type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";

export type FamilySummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  ancestryOrigin: string | null;
};

/** Family sections the platform admin can switch on or off for the whole platform. */
export type FamilyFeature = "feed" | "fund" | "library" | "editSuggestions" | "printBook";

export type FamilyFeatures = Record<FamilyFeature, boolean>;

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
};

export type FamilyTreeRelationship = {
  id: string;
  husbandId: string;
  wifeId: string;
  status: "MARRIED" | "SEPARATED" | "DIVORCED" | "WIDOWED";
  wifeOrder: number | null;
};

export type FamilyTreeResponse = {
  family: FamilySummary;
  people: Person[];
  relationships: FamilyTreeRelationship[];
};
