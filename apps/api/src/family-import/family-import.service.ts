import { randomUUID } from 'node:crypto';

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FamilyStatus, Prisma, RelationshipStatus } from '@prisma/client';

import { assertWithinMemberLimit } from '../common/family-plan.js';
import { planRightsSelect, resolvePlanRights } from '../common/plan-rights.js';
import { PrismaService } from '../database/prisma.service.js';
import type { ImportFamilyTreeDto, ImportPersonDto } from './dto/import-family-tree.dto.js';
import type { FamilyImportResponse, ImportIssue } from './family-import.types.js';
import { checkImport, codeKey, type ImportPlan } from './family-import.validation.js';

const INSERT_CHUNK_SIZE = 500;

function text(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function chunks<T>(items: T[]): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < items.length; start += INSERT_CHUNK_SIZE) {
    result.push(items.slice(start, start + INSERT_CHUNK_SIZE));
  }
  return result;
}

function personData(
  familyId: string,
  person: ImportPersonDto,
  idByCode: Map<string, string>,
  generation: number | undefined,
): Prisma.PersonCreateManyInput {
  const parentId = (code: string | null | undefined): string | null => {
    const key = code?.trim() ? codeKey(code) : null;
    return key ? (idByCode.get(key) ?? null) : null;
  };
  const deathKnown =
    Boolean(text(person.deathDate)) || person.lunarDeathDay != null || person.ageAtDeath != null;
  return {
    id: idByCode.get(codeKey(person.code))!,
    familyId,
    fatherId: parentId(person.fatherCode),
    motherId: parentId(person.motherCode),
    name: person.name.trim(),
    gender: person.gender,
    generation: generation ?? null,
    orderInFamily: person.orderInFamily ?? null,
    honorific: text(person.honorific),
    nickname: text(person.nickname),
    courtesyName: text(person.courtesyName),
    birthDate: text(person.birthDate),
    deathDate: text(person.deathDate),
    isAlive: person.isAlive ?? !deathKnown,
    lunarDeathDay: person.lunarDeathDay ?? null,
    lunarDeathMonth: person.lunarDeathMonth ?? null,
    ageAtDeath: person.ageAtDeath ?? null,
    burialPlace: text(person.burialPlace),
    worshipPlace: text(person.worshipPlace),
    phone: text(person.phone),
    education: text(person.education),
    occupation: text(person.occupation),
    hometown: text(person.hometown),
    currentAddress: text(person.currentAddress),
    biography: text(person.biography),
  };
}

@Injectable()
export class FamilyImportService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Checks the rows and, unless it is a dry run with no issues, adds them as new people. */
  async importTree(familyId: string, input: ImportFamilyTreeDto): Promise<FamilyImportResponse> {
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, status: FamilyStatus.ACTIVE, deletedAt: null },
      select: { plan: { select: { name: true, ...planRightsSelect } } },
    });
    if (!family) {
      throw new NotFoundException('Không tìm thấy dòng họ hoặc dòng họ không còn hoạt động.');
    }

    const existingPeopleCount = await this.prisma.person.count({ where: { familyId } });
    const { issues, plan } = checkImport(input);
    const { maxMembers } = resolvePlanRights(family.plan.features);
    if (maxMembers !== null && existingPeopleCount + input.people.length > maxMembers) {
      issues.push(this.memberLimitIssue(family.plan.name, maxMembers, existingPeopleCount));
    }

    const response: FamilyImportResponse = {
      imported: false,
      issues,
      peopleCount: input.people.length,
      relationshipCount: input.relationships.length,
      existingPeopleCount,
    };
    if (input.dryRun || issues.length > 0 || !plan) return response;

    await this.write(familyId, input, plan);
    return { ...response, imported: true };
  }

  private memberLimitIssue(planName: string, maxMembers: number, existing: number): ImportIssue {
    return {
      sheet: 'people',
      row: null,
      message: `Gói “${planName}” chỉ cho phép tối đa ${maxMembers} thành viên; cây hiện có ${existing} người nên chỉ còn nhập được ${Math.max(0, maxMembers - existing)} người. Hãy nâng cấp gói hoặc bớt dòng trong file.`,
    };
  }

  private async write(
    familyId: string,
    input: ImportFamilyTreeDto,
    plan: ImportPlan,
  ): Promise<void> {
    const idByCode = new Map(input.people.map((person) => [codeKey(person.code), randomUUID()]));

    await this.prisma.$transaction(
      async (transaction) => {
        // Layer by layer so every parent row exists before the foreign keys that point at it.
        for (const layer of plan.layers) {
          const rows = layer.map((person) =>
            personData(familyId, person, idByCode, plan.generationByCode.get(codeKey(person.code))),
          );
          for (const chunk of chunks(rows)) await transaction.person.createMany({ data: chunk });
        }
        await assertWithinMemberLimit(transaction, familyId);

        const relationships = input.relationships.map((relationship) => ({
          familyId,
          husbandId: idByCode.get(codeKey(relationship.husbandCode))!,
          wifeId: idByCode.get(codeKey(relationship.wifeCode))!,
          wifeOrder: relationship.wifeOrder ?? null,
          status: relationship.status ?? RelationshipStatus.MARRIED,
        }));
        for (const chunk of chunks(relationships)) {
          await transaction.relationship.createMany({ data: chunk });
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 120_000,
      },
    );
  }
}
