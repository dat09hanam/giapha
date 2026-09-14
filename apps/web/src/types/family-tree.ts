export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
export type ParentChildType = 'BIOLOGICAL' | 'ADOPTIVE' | 'STEP' | 'FOSTER' | 'GUARDIAN';
export type PartnershipStatus = 'MARRIED' | 'PARTNERED' | 'SEPARATED' | 'DIVORCED' | 'WIDOWED';

export type TenantSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export type Person = {
  id: string;
  displayName: string;
  gender: Gender;
  birthDate: string | null;
  deathDate: string | null;
  avatarUrl: string | null;
  generation: number | null;
};

export type ParentChildRelationship = {
  id: string;
  parentId: string;
  childId: string;
  type: ParentChildType;
};

export type Partnership = {
  id: string;
  partnerAId: string;
  partnerBId: string;
  status: PartnershipStatus;
  startedAt: string | null;
  endedAt: string | null;
};

export type FamilyTreeResponse = {
  tenant: TenantSummary;
  family: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
  };
  people: Person[];
  parentChildRelationships: ParentChildRelationship[];
  partnerships: Partnership[];
};
