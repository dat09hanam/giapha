import type { Gender, MaritalStatus } from '@/types/family-tree';

export type DesignerGender = Gender;

export type DesignerMember = {
  id: string;
  databaseId: string | null;
  name: string;
  honorific: string;
  nickname: string;
  courtesyName: string;
  gender: DesignerGender;
  birthDate: string;
  deathDate: string;
  lunarDeathAnniversary: string;
  isAlive: boolean;
  burialPlace: string;
  phone: string;
  avatarUrl: string;
  biography: string;
  fatherId: string | null;
  motherId: string | null;
  maritalStatus: MaritalStatus | '';
  education: string;
  occupation: string;
  hometown: string;
  currentAddress: string;
  mapUrl: string;
  ageAtDeath: string;
  worshipPlace: string;
  worshipKeeperId: string;
  deathAnniversaryText: string;
  generation: number;
  orderInFamily: number;
  deletesBranch: boolean;
};

export type DesignerRelationship = {
  husbandId: string;
  wifeId: string;
  wifeOrder: number;
};

export type DesignerDraft = {
  people: DesignerMember[];
  relationships: DesignerRelationship[];
  protectedMemberId: string;
};

export function sortMembers(left: DesignerMember, right: DesignerMember): number {
  return (
    left.generation - right.generation ||
    left.orderInFamily - right.orderInFamily ||
    left.name.localeCompare(right.name, 'vi')
  );
}

export function findMember(draft: DesignerDraft, memberId: string): DesignerMember | null {
  return draft.people.find((member) => member.id === memberId) ?? null;
}
