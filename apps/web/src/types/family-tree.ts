import type { FamilyPoster } from "@/lib/poster-decorations";
import type { RichTextDocument } from "@/types/rich-text";

export type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";

export type FamilySummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** The clan head's formatted introduction; null until one is written. */
  introduction: RichTextDocument | null;
  address: string | null;
  ancestryOrigin: string | null;
};

/** Family sections the platform admin can switch on or off for the whole platform. */
export type FamilyFeature = "feed" | "fund" | "merit" | "library" | "editSuggestions" | "printBook";

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
  /** Free text ("15/03/1920", "1850", "khoảng 1850"); read it through lib/partial-date. */
  birthDate: string | null;
  /** Free text, like birthDate. */
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
  /** Nguyên quán, as free text. */
  hometown: string | null;
  currentAddress: string | null;
  /** An http(s) link to a map, e.g. Google Maps. */
  mapUrl: string | null;
  /** Hưởng thọ typed by the family; null means work it out from the dates. */
  ageAtDeath: number | null;
  worshipPlace: string | null;
  /** The relative who keeps the death anniversary. */
  worshipKeeperId: string | null;
  /** How the anniversary reads on the view page, e.g. "20 tháng Chạp năm Canh Ngọ". */
  deathAnniversaryText: string | null;
};

export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';

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
