import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import type { FamilyTreeResponse } from './family-tree.types.js';

@Injectable()
export class FamilyTreeService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getPublicTree(tenantSlug: string, familySlug?: string): Promise<FamilyTreeResponse> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: tenantSlug, status: 'ACTIVE' },
      select: { id: true, slug: true, name: true, description: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant was not found');
    }

    const family = await this.prisma.family.findFirst({
      where: {
        tenantId: tenant.id,
        ...(familySlug ? { slug: familySlug } : {}),
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        people: {
          orderBy: [{ generation: 'asc' }, { displayName: 'asc' }],
          select: {
            id: true,
            displayName: true,
            gender: true,
            birthDate: true,
            deathDate: true,
            avatarUrl: true,
            generation: true,
          },
        },
        parentChildRelationships: {
          select: { id: true, parentId: true, childId: true, type: true },
        },
        partnerships: {
          select: {
            id: true,
            partnerAId: true,
            partnerBId: true,
            status: true,
            startedAt: true,
            endedAt: true,
          },
        },
      },
    });

    if (!family) {
      throw new NotFoundException('Family was not found');
    }

    return {
      tenant,
      family: {
        id: family.id,
        slug: family.slug,
        name: family.name,
        description: family.description,
      },
      people: family.people.map((person) => ({
        ...person,
        birthDate: person.birthDate?.toISOString() ?? null,
        deathDate: person.deathDate?.toISOString() ?? null,
      })),
      parentChildRelationships: family.parentChildRelationships,
      partnerships: family.partnerships.map((partnership) => ({
        ...partnership,
        startedAt: partnership.startedAt?.toISOString() ?? null,
        endedAt: partnership.endedAt?.toISOString() ?? null,
      })),
    };
  }
}
