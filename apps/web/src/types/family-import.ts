import type { Gender } from '@/types/family-tree';

export type RelationshipStatus = 'MARRIED' | 'SEPARATED' | 'DIVORCED' | 'WIDOWED';

export type ImportPersonInput = {
  row: number;
  code: string;
  name: string;
  gender: Gender;
  fatherCode: string | null;
  motherCode: string | null;
  generation: number | null;
  orderInFamily: number | null;
  honorific: string | null;
  nickname: string | null;
  courtesyName: string | null;
  birthDate: string | null;
  deathDate: string | null;
  isAlive: boolean | null;
  lunarDeathDay: number | null;
  lunarDeathMonth: number | null;
  ageAtDeath: number | null;
  burialPlace: string | null;
  worshipPlace: string | null;
  phone: string | null;
  education: string | null;
  occupation: string | null;
  hometown: string | null;
  currentAddress: string | null;
  biography: string | null;
};

export type ImportRelationshipInput = {
  row: number;
  husbandCode: string;
  wifeCode: string;
  wifeOrder: number | null;
  status: RelationshipStatus | null;
};

/** A row of a downloaded member list: its code in the file and the stored person it stands for. */
export type ImportExistingPersonInput = {
  row: number;
  code: string;
  personId: string;
};

export type ImportSheet = 'people' | 'relationships';

export type ImportIssue = {
  sheet: ImportSheet;
  /** Null for a problem with the file as a whole. */
  row: number | null;
  message: string;
};

export type FamilyImportInput = {
  dryRun: boolean;
  people: ImportPersonInput[];
  relationships: ImportRelationshipInput[];
  existingPeople: ImportExistingPersonInput[];
};

export type FamilyImportResult = {
  imported: boolean;
  issues: ImportIssue[];
  peopleCount: number;
  relationshipCount: number;
  existingPeopleCount: number;
};
