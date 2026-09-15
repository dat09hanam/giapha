import type { FastifyRequest } from 'fastify';
import type { UserRole } from '@prisma/client';

export type AuthenticatedUser = {
  sessionId: string;
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  familyId: string | null;
};

export type FamilyAccess = {
  familyId: string;
  slug: string;
  role: UserRole;
};

export type AuthRequest = FastifyRequest & {
  auth?: AuthenticatedUser;
  familyAccess?: FamilyAccess;
};
