import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FamilyStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service.js';
import { FamilyTreeService } from './family-tree.service.js';
import type { FamilyTreeResponse } from './family-tree.types.js';

export type DemoFamilySummary = { id: string; slug: string; name: string };

@Injectable()
export class DemoFamilyService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FamilyTreeService) private readonly familyTree: FamilyTreeService,
  ) {}

  async getDemoFamily(): Promise<DemoFamilySummary> {
    const family = await this.findDemoFamily();
    return { id: family.id, slug: family.slug, name: family.name };
  }

  async getDemoTree(): Promise<FamilyTreeResponse> {
    const family = await this.findDemoFamily();
    const tree = await this.familyTree.getTree(family.id);
    return {
      ...tree,
      people: tree.people.map((person) => ({
        ...person,
        phone: null,
        avatarUrl: null,
        currentAddress: null,
        mapUrl: null,
      })),
    };
  }

  private async findDemoFamily(): Promise<{ id: string; slug: string; name: string }> {
    const family = await this.prisma.family.findFirst({
      where: { isDemo: true, status: FamilyStatus.ACTIVE, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, slug: true, name: true },
    });
    if (!family) throw new NotFoundException('Chưa có gia phả mẫu.');
    return family;
  }
}
