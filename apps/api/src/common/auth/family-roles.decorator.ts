import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export const FAMILY_ROLES_KEY = 'family_roles';

export const FamilyRoles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(FAMILY_ROLES_KEY, roles);
