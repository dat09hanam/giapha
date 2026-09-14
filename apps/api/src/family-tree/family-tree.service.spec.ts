import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../database/prisma.service.js';
import { FamilyTreeService } from './family-tree.service.js';

describe('FamilyTreeService', () => {
  const tenantFindFirst = vi.fn();
  const familyFindFirst = vi.fn();
  const prisma = {
    tenant: { findFirst: tenantFindFirst },
    family: { findFirst: familyFindFirst },
  } as unknown as PrismaService;
  const service = new FamilyTreeService(prisma);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the server-resolved tenant id to scope the family query', async () => {
    tenantFindFirst.mockResolvedValue({
      id: 'tenant-1',
      slug: 'demo',
      name: 'Demo family',
      description: null,
    });
    familyFindFirst.mockResolvedValue({
      id: 'family-1',
      slug: 'main',
      name: 'Main branch',
      description: null,
      people: [],
      parentChildRelationships: [],
      partnerships: [],
    });

    await service.getPublicTree('demo', 'main');

    expect(familyFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', slug: 'main' },
      }),
    );
  });

  it('does not query family data when the tenant is unavailable', async () => {
    tenantFindFirst.mockResolvedValue(null);

    await expect(service.getPublicTree('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(familyFindFirst).not.toHaveBeenCalled();
  });
});
