import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FamilyStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service.js';
import type { CreatePersonDto } from './dto/create-person.dto.js';
import type { UpdatePersonDto } from './dto/update-person.dto.js';
import type { FamilyTreeResponse, PersonResponse } from './family-tree.types.js';

const managedPersonSelect = {
  id: true,
  familyId: true,
  fatherId: true,
  motherId: true,
  displayName: true,
  givenName: true,
  familyName: true,
  gender: true,
  birthDate: true,
  deathDate: true,
  avatarUrl: true,
  biography: true,
  generation: true,
} satisfies Prisma.PersonSelect;

type ManagedPersonRecord = Prisma.PersonGetPayload<{ select: typeof managedPersonSelect }>;

function mapManagedPerson(person: ManagedPersonRecord): PersonResponse {
  return {
    ...person,
    birthDate: person.birthDate?.toISOString() ?? null,
    deathDate: person.deathDate?.toISOString() ?? null,
  };
}

function nullableDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  return value === null ? null : new Date(value);
}

@Injectable()
export class FamilyTreeService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getTree(familyId: string): Promise<FamilyTreeResponse> {
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, status: FamilyStatus.ACTIVE },
      select: { id: true, slug: true, name: true, description: true },
    });
    if (!family) throw new NotFoundException('Family was not found');

    const people = await this.prisma.person.findMany({
      where: { familyId },
      orderBy: [{ generation: 'asc' }, { displayName: 'asc' }],
      select: {
        id: true,
        displayName: true,
        gender: true,
        birthDate: true,
        deathDate: true,
        avatarUrl: true,
        generation: true,
        fatherId: true,
        motherId: true,
      },
    });
    return {
      family,
      people: people.map((person) => ({
        ...person,
        birthDate: person.birthDate?.toISOString() ?? null,
        deathDate: person.deathDate?.toISOString() ?? null,
      })),
    };
  }

  async createPerson(familyId: string, input: CreatePersonDto): Promise<PersonResponse> {
    return this.prisma.$transaction(
      async (transaction) => {
        const family = await transaction.family.findFirst({
          where: { id: familyId, status: FamilyStatus.ACTIVE },
          select: { id: true },
        });
        if (!family) throw new NotFoundException('Family was not found');
        const fatherId = input.fatherId ?? null;
        const motherId = input.motherId ?? null;
        await this.validateParents(transaction, familyId, null, fatherId, motherId);

        const person = await transaction.person.create({
          data: {
            familyId,
            fatherId,
            motherId,
            displayName: input.displayName.trim(),
            givenName: input.givenName?.trim() || null,
            familyName: input.familyName?.trim() || null,
            gender: input.gender,
            birthDate: nullableDate(input.birthDate),
            deathDate: nullableDate(input.deathDate),
            avatarUrl: input.avatarUrl?.trim() || null,
            biography: input.biography?.trim() || null,
            generation: input.generation,
          },
          select: managedPersonSelect,
        });
        return mapManagedPerson(person);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async updatePerson(
    familyId: string,
    personId: string,
    input: UpdatePersonDto,
  ): Promise<PersonResponse> {
    return this.prisma.$transaction(
      async (transaction) => {
        const existing = await transaction.person.findFirst({
          where: { id: personId, familyId },
          select: { id: true, fatherId: true, motherId: true },
        });
        if (!existing) throw new NotFoundException('Person was not found');
        const fatherId = input.fatherId === undefined ? existing.fatherId : input.fatherId;
        const motherId = input.motherId === undefined ? existing.motherId : input.motherId;
        await this.validateParents(transaction, familyId, personId, fatherId, motherId);

        const data: Prisma.PersonUpdateManyMutationInput = {
          ...(input.fatherId === undefined ? {} : { fatherId }),
          ...(input.motherId === undefined ? {} : { motherId }),
          ...(input.displayName === undefined ? {} : { displayName: input.displayName.trim() }),
          ...(input.givenName === undefined ? {} : { givenName: input.givenName?.trim() || null }),
          ...(input.familyName === undefined ? {} : { familyName: input.familyName?.trim() || null }),
          ...(input.gender === undefined ? {} : { gender: input.gender }),
          ...(input.birthDate === undefined ? {} : { birthDate: nullableDate(input.birthDate) }),
          ...(input.deathDate === undefined ? {} : { deathDate: nullableDate(input.deathDate) }),
          ...(input.avatarUrl === undefined ? {} : { avatarUrl: input.avatarUrl?.trim() || null }),
          ...(input.biography === undefined ? {} : { biography: input.biography?.trim() || null }),
          ...(input.generation === undefined ? {} : { generation: input.generation }),
        };
        const updated = await transaction.person.updateMany({
          where: { id: personId, familyId },
          data,
        });
        if (updated.count !== 1) throw new NotFoundException('Person was not found');
        const person = await transaction.person.findFirstOrThrow({
          where: { id: personId, familyId },
          select: managedPersonSelect,
        });
        return mapManagedPerson(person);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async deletePerson(familyId: string, personId: string): Promise<void> {
    await this.prisma.$transaction(
      async (transaction) => {
        const existing = await transaction.person.findFirst({
          where: { id: personId, familyId },
          select: { id: true },
        });
        if (!existing) throw new NotFoundException('Person was not found');
        await transaction.person.updateMany({
          where: { familyId, fatherId: personId },
          data: { fatherId: null },
        });
        await transaction.person.updateMany({
          where: { familyId, motherId: personId },
          data: { motherId: null },
        });
        const deleted = await transaction.person.deleteMany({
          where: { id: personId, familyId },
        });
        if (deleted.count !== 1) throw new NotFoundException('Person was not found');
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async validateParents(
    transaction: Prisma.TransactionClient,
    familyId: string,
    personId: string | null,
    fatherId: string | null,
    motherId: string | null,
  ): Promise<void> {
    if (fatherId && motherId && fatherId === motherId) {
      throw new BadRequestException('Father and mother must be different people');
    }
    if (personId && (personId === fatherId || personId === motherId)) {
      throw new BadRequestException('A person cannot be their own parent');
    }

    const requested = [...new Set([fatherId, motherId].filter((id): id is string => id !== null))];
    if (!requested.length) return;
    const parents = await transaction.person.findMany({
      where: { familyId, id: { in: requested } },
      select: { id: true },
    });
    if (parents.length !== requested.length) {
      throw new BadRequestException('Parents must belong to the same family');
    }
    if (!personId) return;

    const people = await transaction.person.findMany({
      where: { familyId },
      select: { id: true, fatherId: true, motherId: true },
    });
    const byId = new Map(people.map((person) => [person.id, person]));
    for (const parentId of requested) {
      const visited = new Set<string>();
      const pending = [parentId];
      while (pending.length) {
        const id = pending.pop();
        if (!id || visited.has(id)) continue;
        if (id === personId) throw new BadRequestException('Parent link would create a cycle');
        visited.add(id);
        const person = byId.get(id);
        if (person?.fatherId) pending.push(person.fatherId);
        if (person?.motherId) pending.push(person.motherId);
      }
    }
  }
}
