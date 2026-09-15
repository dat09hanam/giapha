import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../database/prisma.service.js';
import { FamilyTreeService } from './family-tree.service.js';

describe('FamilyTreeService', () => {
  const tenantFindFirst = vi.fn();
  const familyFindFirst = vi.fn();
  const personCreate = vi.fn();
  const personUpdateMany = vi.fn();
  const personFindFirstOrThrow = vi.fn();
  const prisma = {
    tenant: { findFirst: tenantFindFirst },
    family: { findFirst: familyFindFirst },
    person: {
      create: personCreate,
      updateMany: personUpdateMany,
      findFirstOrThrow: personFindFirstOrThrow,
    },
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

  it('creates a person only in a family from the trusted tenant', async () => {
    familyFindFirst.mockResolvedValue({ id: 'family-1' });
    personCreate.mockResolvedValue({
      id: 'person-1',
      familyId: 'family-1',
      displayName: 'Nguyễn Văn An',
      givenName: null,
      familyName: null,
      gender: 'UNKNOWN',
      birthDate: null,
      deathDate: null,
      avatarUrl: null,
      biography: null,
      generation: null,
    });

    await service.createPerson('tenant-1', {
      familyId: '00000000-0000-4000-8000-000000000101',
      displayName: 'Nguyễn Văn An',
    });

    expect(familyFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          id: '00000000-0000-4000-8000-000000000101',
        },
      }),
    );
    expect(personCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 'tenant-1', familyId: 'family-1' }),
      }),
    );
  });

  it('includes the trusted tenant id in person updates', async () => {
    personUpdateMany.mockResolvedValue({ count: 1 });
    personFindFirstOrThrow.mockResolvedValue({
      id: 'person-1',
      familyId: 'family-1',
      displayName: 'Tên mới',
      givenName: null,
      familyName: null,
      gender: 'UNKNOWN',
      birthDate: null,
      deathDate: null,
      avatarUrl: null,
      biography: null,
      generation: null,
    });

    await service.updatePerson('tenant-1', 'person-1', { displayName: 'Tên mới' });

    expect(personUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'person-1', tenantId: 'tenant-1' } }),
    );
  });
});
