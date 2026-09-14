import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service.js';

export type TenantSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  familyCount: number;
};

@Injectable()
export class TenantsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getPublicTenant(slug: string): Promise<TenantSummary> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug, status: TenantStatus.ACTIVE },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        _count: { select: { families: true } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant was not found');
    }

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      description: tenant.description,
      familyCount: tenant._count.families,
    };
  }
}
