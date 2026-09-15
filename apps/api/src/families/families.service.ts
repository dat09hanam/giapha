import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FamilyStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service.js';
import type { UpdateFamilyDto } from './dto/update-family.dto.js';

export type FamilySummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

@Injectable()
export class FamiliesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getPublicFamily(slug: string): Promise<FamilySummary> {
    const family = await this.prisma.family.findFirst({
      where: { slug, status: FamilyStatus.ACTIVE },
      select: { id: true, slug: true, name: true, description: true },
    });
    if (!family) throw new NotFoundException('Family was not found');
    return family;
  }

  async updateFamily(familyId: string, input: UpdateFamilyDto): Promise<FamilySummary> {
    const updated = await this.prisma.family.updateMany({
      where: { id: familyId, status: FamilyStatus.ACTIVE },
      data: {
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.description === undefined
          ? {}
          : { description: input.description.trim() || null }),
      },
    });
    if (updated.count !== 1) throw new NotFoundException('Family was not found');
    return this.prisma.family.findUniqueOrThrow({
      where: { id: familyId },
      select: { id: true, slug: true, name: true, description: true },
    });
  }
}
