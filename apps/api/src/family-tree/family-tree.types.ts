import type { Gender, ParentChildType, PartnershipStatus } from '@prisma/client';

export type FamilyTreeResponse = {
  tenant: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
  };
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
  }>;
  parentChildRelationships: Array<{
    id: string;
    parentId: string;
    childId: string;
    type: ParentChildType;
  }>;
  partnerships: Array<{
    id: string;
    partnerAId: string;
    partnerBId: string;
    status: PartnershipStatus;
    startedAt: string | null;
    endedAt: string | null;
  }>;
};
