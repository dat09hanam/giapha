import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FamilyStatus, Prisma, RelationshipStatus, UserRole } from '@prisma/client';
import type { MaritalStatus } from '@prisma/client';

import { computeBranchScope, type BranchScope } from '../branches/branch-scope.js';
import type { FamilyAccess } from '../common/auth/auth.types.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreatePersonDto } from './dto/create-person.dto.js';
import type { SaveFamilyTreeDesignDto } from './dto/save-family-tree-design.dto.js';
import type { UpdatePersonDto } from './dto/update-person.dto.js';
import type {
  FamilyTreeEditScope,
  FamilyTreeResponse,
  PersonResponse,
  SaveFamilyTreeDesignResponse,
} from './family-tree.types.js';

const managedPersonSelect = {
  id: true,
  familyId: true,
  fatherId: true,
  motherId: true,
  name: true,
  honorific: true,
  nickname: true,
  courtesyName: true,
  gender: true,
  birthDate: true,
  deathDate: true,
  lunarDeathDay: true,
  lunarDeathMonth: true,
  isAlive: true,
  burialPlace: true,
  phone: true,
  avatarUrl: true,
  biography: true,
  generation: true,
  orderInFamily: true,
  maritalStatus: true,
  education: true,
  occupation: true,
  hometown: true,
  currentAddress: true,
  mapUrl: true,
  ageAtDeath: true,
  worshipPlace: true,
  worshipKeeperId: true,
  deathAnniversaryText: true,
} satisfies Prisma.PersonSelect;

type ManagedPersonRecord = Prisma.PersonGetPayload<{
  select: typeof managedPersonSelect;
}>;

function mapManagedPerson(person: ManagedPersonRecord): PersonResponse {
  return { ...person };
}

function yearOf(value: string | null | undefined): number | null {
  if (!value) return null;
  const text = value.trim().replace(/^khoảng\s+/i, '');
  const iso = /^(\d{4})-\d{2}-\d{2}/.exec(text);
  const dated = /^(?:\d{1,2}[/.-]){1,2}(\d{1,4})$/.exec(text);
  const year =
    iso?.[1] ??
    dated?.[1] ??
    (/^\d{1,4}$/.test(text) ? text : /(?<!\d)(\d{3,4})(?!\d)/.exec(text)?.[1]);
  return year && Number(year) > 0 ? Number(year) : null;
}

function nullableText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value?.trim() || null;
}

const PROFILE_TEXT_FIELDS = [
  'education',
  'occupation',
  'hometown',
  'currentAddress',
  'mapUrl',
  'worshipPlace',
  'deathAnniversaryText',
] as const;

type ProfileTextField = (typeof PROFILE_TEXT_FIELDS)[number];

type ProfileFields = Partial<Record<ProfileTextField, string | null>> & {
  maritalStatus?: MaritalStatus | null;
  ageAtDeath?: number | null;
};

function profileData(input: ProfileFields, onlyGiven = false): ProfileFields {
  const data: ProfileFields = {};
  for (const field of PROFILE_TEXT_FIELDS) {
    if (onlyGiven && input[field] === undefined) continue;
    data[field] = nullableText(input[field]) ?? null;
  }
  if (!onlyGiven || input.maritalStatus !== undefined) {
    data.maritalStatus = input.maritalStatus ?? null;
  }
  if (!onlyGiven || input.ageAtDeath !== undefined) {
    data.ageAtDeath = input.ageAtDeath ?? null;
  }
  return data;
}

function validateDesignInput(input: SaveFamilyTreeDesignDto): void {
  const peopleByClientId = new Map<string, (typeof input.people)[number]>();
  const databaseIds = new Set<string>();

  for (const person of input.people) {
    if (!person.name.trim()) {
      throw new BadRequestException('Họ và tên thành viên không được để trống.');
    }
    if (peopleByClientId.has(person.clientId)) {
      throw new BadRequestException('Bản thiết kế chứa mã thành viên bị trùng.');
    }
    if (person.databaseId && databaseIds.has(person.databaseId)) {
      throw new BadRequestException('Bản thiết kế tham chiếu trùng một thành viên đã lưu.');
    }
    const bornIn = yearOf(person.birthDate);
    const diedIn = yearOf(person.deathDate);
    if (bornIn !== null && diedIn !== null && diedIn < bornIn) {
      throw new BadRequestException('Năm mất của thành viên không được trước năm sinh.');
    }
    peopleByClientId.set(person.clientId, person);
    if (person.databaseId) databaseIds.add(person.databaseId);
  }

  const deletedIds = new Set(input.deletedPersonIds ?? []);
  for (const databaseId of databaseIds) {
    if (deletedIds.has(databaseId)) {
      throw new BadRequestException('Một thành viên không thể vừa được lưu vừa được đánh dấu xóa.');
    }
  }

  for (const person of input.people) {
    for (const parentClientId of [person.fatherClientId, person.motherClientId]) {
      if (parentClientId && !peopleByClientId.has(parentClientId)) {
        throw new BadRequestException(
          'Cha hoặc mẹ trong bản thiết kế không thuộc danh sách thành viên được lưu.',
        );
      }
      if (parentClientId && parentClientId === person.clientId) {
        throw new BadRequestException('Một thành viên không thể là cha hoặc mẹ của chính mình.');
      }
    }
    if (
      person.fatherClientId &&
      person.motherClientId &&
      person.fatherClientId === person.motherClientId
    ) {
      throw new BadRequestException('Cha và mẹ phải là hai thành viên khác nhau.');
    }
    if (person.fatherClientId && peopleByClientId.get(person.fatherClientId)?.gender !== 'MALE') {
      throw new BadRequestException('Người cha phải có giới tính nam.');
    }
    if (person.motherClientId && peopleByClientId.get(person.motherClientId)?.gender !== 'FEMALE') {
      throw new BadRequestException('Người mẹ phải có giới tính nữ.');
    }
  }

  const coupleKey = (leftId: string, rightId: string): string =>
    leftId < rightId ? leftId + '|' + rightId : rightId + '|' + leftId;
  const couples = new Set(
    input.relationships.map((relationship) =>
      coupleKey(relationship.husbandClientId, relationship.wifeClientId),
    ),
  );
  const namesakesByKey = new Map<string, string[]>();
  for (const person of input.people) {
    if (!person.fatherClientId && !person.motherClientId) continue;
    const key = [
      person.name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi'),
      person.fatherClientId ?? '',
      person.motherClientId ?? '',
    ].join('|');
    const namesakes = namesakesByKey.get(key) ?? [];
    if (namesakes.some((otherId) => !couples.has(coupleKey(otherId, person.clientId)))) {
      throw new BadRequestException('Bản thiết kế có hai anh chị em ruột trùng họ tên.');
    }
    namesakesByKey.set(key, [...namesakes, person.clientId]);
  }

  const relationshipKeys = new Set<string>();
  for (const relationship of input.relationships) {
    if (
      !peopleByClientId.has(relationship.husbandClientId) ||
      !peopleByClientId.has(relationship.wifeClientId)
    ) {
      throw new BadRequestException(
        'Quan hệ vợ chồng phải tham chiếu thành viên trong cùng bản thiết kế.',
      );
    }
    if (relationship.husbandClientId === relationship.wifeClientId) {
      throw new BadRequestException('Một thành viên không thể kết hôn với chính mình.');
    }
    if (
      peopleByClientId.get(relationship.husbandClientId)?.gender !== 'MALE' ||
      peopleByClientId.get(relationship.wifeClientId)?.gender !== 'FEMALE'
    ) {
      throw new BadRequestException(
        'Quan hệ vợ chồng yêu cầu người chồng là nam và người vợ là nữ.',
      );
    }
    const key = [relationship.husbandClientId, relationship.wifeClientId].sort().join(':');
    if (relationshipKeys.has(key)) {
      throw new BadRequestException('Bản thiết kế chứa quan hệ vợ chồng bị trùng.');
    }
    relationshipKeys.add(key);
  }

  const visitState = new Map<string, 'visiting' | 'visited'>();
  function visit(clientId: string): void {
    const state = visitState.get(clientId);
    if (state === 'visiting') {
      throw new BadRequestException('Quan hệ cha mẹ trong bản thiết kế tạo thành vòng lặp.');
    }
    if (state === 'visited') return;

    visitState.set(clientId, 'visiting');
    const person = peopleByClientId.get(clientId);
    for (const parentClientId of [person?.fatherClientId, person?.motherClientId]) {
      if (parentClientId) visit(parentClientId);
    }
    visitState.set(clientId, 'visited');
  }

  for (const clientId of peopleByClientId.keys()) visit(clientId);
}

type BranchRestriction = { rootIds: Set<string>; before: BranchScope };

const OUTSIDE_BRANCH_MESSAGE =
  'Bạn chỉ được chỉnh sửa thành viên thuộc chi/nhánh được giao quản lý.';

async function loadBranchScope(
  transaction: Prisma.TransactionClient,
  familyId: string,
  rootIds: Iterable<string>,
): Promise<BranchScope> {
  const [people, relationships] = await Promise.all([
    transaction.person.findMany({
      where: { familyId },
      select: { id: true, fatherId: true, motherId: true },
    }),
    transaction.relationship.findMany({
      where: { familyId },
      select: { husbandId: true, wifeId: true },
    }),
  ]);
  return computeBranchScope(people, relationships, rootIds);
}

@Injectable()
export class FamilyTreeService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getTree(familyId: string): Promise<FamilyTreeResponse> {
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, status: FamilyStatus.ACTIVE, deletedAt: null },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        address: true,
        ancestryOrigin: true,
      },
    });
    if (!family)
      throw new NotFoundException('Không tìm thấy dòng họ hoặc dòng họ không còn hoạt động.');

    const [people, relationships] = await Promise.all([
      this.prisma.person.findMany({
        where: { familyId },
        orderBy: [{ generation: 'asc' }, { orderInFamily: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          honorific: true,
          nickname: true,
          courtesyName: true,
          gender: true,
          birthDate: true,
          deathDate: true,
          lunarDeathDay: true,
          lunarDeathMonth: true,
          isAlive: true,
          burialPlace: true,
          phone: true,
          avatarUrl: true,
          biography: true,
          generation: true,
          orderInFamily: true,
          maritalStatus: true,
          education: true,
          occupation: true,
          hometown: true,
          currentAddress: true,
          mapUrl: true,
          ageAtDeath: true,
          worshipPlace: true,
          worshipKeeperId: true,
          deathAnniversaryText: true,
          fatherId: true,
          motherId: true,
        },
      }),
      this.prisma.relationship.findMany({
        where: { familyId },
        orderBy: [{ husbandId: 'asc' }, { wifeOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          husbandId: true,
          wifeId: true,
          status: true,
          wifeOrder: true,
        },
      }),
    ]);

    return {
      family,
      people,
      relationships,
    };
  }

  async getEditScope(access: FamilyAccess): Promise<FamilyTreeEditScope> {
    if (access.role === UserRole.MEMBER_PLUS) {
      return { fullAccess: true, rootPersonIds: [] };
    }
    const branches = await this.prisma.branchManager.findMany({
      where: { familyId: access.familyId, userId: access.userId },
      select: { rootPersonId: true },
    });
    return {
      fullAccess: false,
      rootPersonIds: branches.map((branch) => branch.rootPersonId),
    };
  }

  async saveDesign(
    access: FamilyAccess,
    input: SaveFamilyTreeDesignDto,
  ): Promise<SaveFamilyTreeDesignResponse> {
    validateDesignInput(input);
    const { familyId } = access;

    return this.prisma.$transaction(
      async (transaction) => {
        const family = await transaction.family.findFirst({
          where: { id: familyId, status: FamilyStatus.ACTIVE, deletedAt: null },
          select: { id: true },
        });
        if (!family) {
          throw new NotFoundException('Không tìm thấy dòng họ hoặc dòng họ không còn hoạt động.');
        }

        const restriction = await this.loadBranchRestriction(transaction, access);
        const mayEdit = (databaseId: string): boolean =>
          !restriction || restriction.before.editable.has(databaseId);
        const mayMove = (databaseId: string): boolean =>
          !restriction ||
          (restriction.before.lineage.has(databaseId) && !restriction.rootIds.has(databaseId));
        if (
          restriction &&
          (input.deletedPersonIds ?? []).some((id) => !mayEdit(id) || restriction.rootIds.has(id))
        ) {
          throw new ForbiddenException(
            'Bạn chỉ được xóa thành viên trong chi/nhánh được giao, không gồm người đứng đầu chi.',
          );
        }

        const currentDatabaseIds = input.people
          .map((person) => person.databaseId)
          .filter((id): id is string => Boolean(id));
        const deletedPersonIds = input.deletedPersonIds ?? [];
        const referencedDatabaseIds = [...new Set([...currentDatabaseIds, ...deletedPersonIds])];

        if (referencedDatabaseIds.length > 0) {
          const existingPeople = await transaction.person.findMany({
            where: { familyId, id: { in: referencedDatabaseIds } },
            select: { id: true },
          });
          if (existingPeople.length !== referencedDatabaseIds.length) {
            throw new BadRequestException(
              'Bản thiết kế tham chiếu thành viên không thuộc dòng họ hoặc đã bị xóa.',
            );
          }
        }

        const databaseIdByClientId = new Map<string, string>();
        const createdIds = new Set<string>();
        for (const person of input.people) {
          const data = {
            name: person.name.trim(),
            honorific: nullableText(person.honorific) ?? null,
            nickname: nullableText(person.nickname) ?? null,
            courtesyName: nullableText(person.courtesyName) ?? null,
            gender: person.gender,
            birthDate: nullableText(person.birthDate) ?? null,
            deathDate: nullableText(person.deathDate) ?? null,
            lunarDeathDay: person.lunarDeathDay ?? null,
            lunarDeathMonth: person.lunarDeathMonth ?? null,
            isAlive: person.isAlive ?? !person.deathDate,
            burialPlace: nullableText(person.burialPlace) ?? null,
            phone: nullableText(person.phone) ?? null,
            avatarUrl: nullableText(person.avatarUrl) ?? null,
            biography: nullableText(person.biography) ?? null,
            generation: person.generation,
            orderInFamily: person.orderInFamily,
            ...profileData(person),
          };

          if (person.databaseId && !mayEdit(person.databaseId)) {
            databaseIdByClientId.set(person.clientId, person.databaseId);
          } else if (person.databaseId) {
            const updated = await transaction.person.updateMany({
              where: { id: person.databaseId, familyId },
              data,
            });
            if (updated.count !== 1) {
              throw new NotFoundException('Không tìm thấy thành viên trong dòng họ này.');
            }
            databaseIdByClientId.set(person.clientId, person.databaseId);
          } else {
            const created = await transaction.person.create({
              data: {
                familyId,
                fatherId: null,
                motherId: null,
                ...data,
              },
              select: { id: true },
            });
            createdIds.add(created.id);
            databaseIdByClientId.set(person.clientId, created.id);
          }
        }

        for (const person of input.people) {
          const databaseId = databaseIdByClientId.get(person.clientId);
          if (!databaseId) {
            throw new BadRequestException('Không thể ánh xạ thành viên trong bản thiết kế.');
          }
          const fatherId = person.fatherClientId
            ? databaseIdByClientId.get(person.fatherClientId)
            : null;
          const motherId = person.motherClientId
            ? databaseIdByClientId.get(person.motherClientId)
            : null;
          if (person.fatherClientId && !fatherId) {
            throw new BadRequestException('Không thể ánh xạ người cha trong bản thiết kế.');
          }
          if (person.motherClientId && !motherId) {
            throw new BadRequestException('Không thể ánh xạ người mẹ trong bản thiết kế.');
          }

          const worshipKeeperId = person.worshipKeeperClientId
            ? databaseIdByClientId.get(person.worshipKeeperClientId)
            : null;
          if (person.worshipKeeperClientId && !worshipKeeperId) {
            throw new BadRequestException(
              'Không thể ánh xạ người phụ trách cúng giỗ trong bản thiết kế.',
            );
          }
          if (!person.databaseId || mayEdit(person.databaseId)) {
            await transaction.person.updateMany({
              where: { id: databaseId, familyId },
              data: { worshipKeeperId },
            });
          }

          if (person.databaseId && !mayMove(person.databaseId)) continue;
          await transaction.person.updateMany({
            where: { id: databaseId, familyId },
            data: { fatherId, motherId },
          });
        }

        let deletedPersonCount = 0;
        if (deletedPersonIds.length > 0) {
          await this.detachPersonReferences(transaction, familyId, deletedPersonIds);
          const deleted = await transaction.person.deleteMany({
            where: { familyId, id: { in: deletedPersonIds } },
          });
          deletedPersonCount = deleted.count;
        }

        const touchesEditable = (id: string): boolean => createdIds.has(id) || mayEdit(id);
        const savedDatabaseIds = [...databaseIdByClientId.values()].filter(touchesEditable);
        await transaction.relationship.deleteMany({
          where: {
            familyId,
            OR: [{ husbandId: { in: savedDatabaseIds } }, { wifeId: { in: savedDatabaseIds } }],
          },
        });

        for (const relationship of input.relationships) {
          const husbandId = databaseIdByClientId.get(relationship.husbandClientId);
          const wifeId = databaseIdByClientId.get(relationship.wifeClientId);
          if (!husbandId || !wifeId) {
            throw new BadRequestException('Không thể ánh xạ quan hệ vợ chồng trong bản thiết kế.');
          }
          if (!touchesEditable(husbandId) && !touchesEditable(wifeId)) continue;

          await transaction.relationship.upsert({
            where: {
              familyId_husbandId_wifeId: { familyId, husbandId, wifeId },
            },
            create: {
              familyId,
              husbandId,
              wifeId,
              status: RelationshipStatus.MARRIED,
              wifeOrder: relationship.wifeOrder,
            },
            update: {
              status: RelationshipStatus.MARRIED,
              wifeOrder: relationship.wifeOrder,
            },
          });
        }

        if (restriction) {
          const after = await loadBranchScope(transaction, familyId, restriction.rootIds);
          const deletedIds = new Set(deletedPersonIds);
          const strayed = [
            ...createdIds,
            ...[...restriction.before.editable].filter((id) => !deletedIds.has(id)),
          ].some((id) => !after.editable.has(id));
          if (strayed) {
            throw new ForbiddenException(
              'Thay đổi này đưa thành viên ra ngoài chi/nhánh bạn quản lý. Thành viên mới phải là con cháu hoặc vợ/chồng của người trong chi.',
            );
          }
        }

        return {
          savedPeople: input.people.map((person) => ({
            clientId: person.clientId,
            databaseId: databaseIdByClientId.get(person.clientId)!,
          })),
          savedRelationshipCount: input.relationships.length,
          deletedPersonCount,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async createPerson(familyId: string, input: CreatePersonDto): Promise<PersonResponse> {
    return this.prisma.$transaction(
      async (transaction) => {
        const family = await transaction.family.findFirst({
          where: { id: familyId, status: FamilyStatus.ACTIVE, deletedAt: null },
          select: { id: true },
        });
        if (!family)
          throw new NotFoundException('Không tìm thấy dòng họ hoặc dòng họ không còn hoạt động.');
        const fatherId = input.fatherId ?? null;
        const motherId = input.motherId ?? null;
        await this.validateParents(transaction, familyId, null, fatherId, motherId);
        const worshipKeeperId = input.worshipKeeperId ?? null;
        await this.validateWorshipKeeper(transaction, familyId, worshipKeeperId);

        const person = await transaction.person.create({
          data: {
            familyId,
            fatherId,
            motherId,
            name: input.name.trim(),
            honorific: nullableText(input.honorific) ?? null,
            nickname: nullableText(input.nickname) ?? null,
            courtesyName: nullableText(input.courtesyName) ?? null,
            gender: input.gender,
            birthDate: nullableText(input.birthDate) ?? null,
            deathDate: nullableText(input.deathDate) ?? null,
            lunarDeathDay: input.lunarDeathDay,
            lunarDeathMonth: input.lunarDeathMonth,
            isAlive: input.isAlive,
            burialPlace: nullableText(input.burialPlace) ?? null,
            phone: nullableText(input.phone) ?? null,
            avatarUrl: nullableText(input.avatarUrl) ?? null,
            biography: nullableText(input.biography) ?? null,
            generation: input.generation,
            orderInFamily: input.orderInFamily,
            ...profileData(input),
            worshipKeeperId,
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
        if (!existing) throw new NotFoundException('Không tìm thấy thành viên trong dòng họ này.');
        const fatherId = input.fatherId === undefined ? existing.fatherId : input.fatherId;
        const motherId = input.motherId === undefined ? existing.motherId : input.motherId;
        await this.validateParents(transaction, familyId, personId, fatherId, motherId);
        if (input.worshipKeeperId) {
          await this.validateWorshipKeeper(transaction, familyId, input.worshipKeeperId);
        }

        const data: Prisma.PersonUpdateManyMutationInput = {
          ...(input.fatherId === undefined ? {} : { fatherId }),
          ...(input.motherId === undefined ? {} : { motherId }),
          ...(input.name === undefined ? {} : { name: input.name.trim() }),
          ...(input.honorific === undefined ? {} : { honorific: nullableText(input.honorific) }),
          ...(input.nickname === undefined ? {} : { nickname: nullableText(input.nickname) }),
          ...(input.courtesyName === undefined
            ? {}
            : { courtesyName: nullableText(input.courtesyName) }),
          ...(input.gender === undefined ? {} : { gender: input.gender }),
          ...(input.birthDate === undefined ? {} : { birthDate: nullableText(input.birthDate) }),
          ...(input.deathDate === undefined ? {} : { deathDate: nullableText(input.deathDate) }),
          ...(input.lunarDeathDay === undefined ? {} : { lunarDeathDay: input.lunarDeathDay }),
          ...(input.lunarDeathMonth === undefined
            ? {}
            : { lunarDeathMonth: input.lunarDeathMonth }),
          ...(input.isAlive === undefined ? {} : { isAlive: input.isAlive }),
          ...(input.burialPlace === undefined
            ? {}
            : { burialPlace: nullableText(input.burialPlace) }),
          ...(input.phone === undefined ? {} : { phone: nullableText(input.phone) }),
          ...(input.avatarUrl === undefined ? {} : { avatarUrl: nullableText(input.avatarUrl) }),
          ...(input.biography === undefined ? {} : { biography: nullableText(input.biography) }),
          ...(input.generation === undefined ? {} : { generation: input.generation }),
          ...(input.orderInFamily === undefined ? {} : { orderInFamily: input.orderInFamily }),
          ...profileData(input, true),
          ...(input.worshipKeeperId === undefined
            ? {}
            : { worshipKeeperId: input.worshipKeeperId }),
        };
        const updated = await transaction.person.updateMany({
          where: { id: personId, familyId },
          data,
        });
        if (updated.count !== 1)
          throw new NotFoundException('Không tìm thấy thành viên trong dòng họ này.');
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
        if (!existing) throw new NotFoundException('Không tìm thấy thành viên trong dòng họ này.');
        await this.detachPersonReferences(transaction, familyId, [personId]);
        const deleted = await transaction.person.deleteMany({
          where: { id: personId, familyId },
        });
        if (deleted.count !== 1)
          throw new NotFoundException('Không tìm thấy thành viên trong dòng họ này.');
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async loadBranchRestriction(
    transaction: Prisma.TransactionClient,
    access: FamilyAccess,
  ): Promise<BranchRestriction | null> {
    if (access.role === UserRole.MEMBER_PLUS) return null;
    const branches = await transaction.branchManager.findMany({
      where: { familyId: access.familyId, userId: access.userId },
      select: { rootPersonId: true },
    });
    if (!branches.length) throw new ForbiddenException(OUTSIDE_BRANCH_MESSAGE);
    const rootIds = new Set(branches.map((branch) => branch.rootPersonId));
    return {
      rootIds,
      before: await loadBranchScope(transaction, access.familyId, rootIds),
    };
  }

  private async validateWorshipKeeper(
    transaction: Prisma.TransactionClient,
    familyId: string,
    worshipKeeperId: string | null,
  ): Promise<void> {
    if (!worshipKeeperId) return;
    const keeper = await transaction.person.findFirst({
      where: { id: worshipKeeperId, familyId },
      select: { id: true },
    });
    if (!keeper) {
      throw new BadRequestException('Người phụ trách cúng giỗ phải là thành viên trong dòng họ.');
    }
  }

  private async detachPersonReferences(
    transaction: Prisma.TransactionClient,
    familyId: string,
    personIds: string[],
  ): Promise<void> {
    if (personIds.length === 0) return;

    await transaction.person.updateMany({
      where: { familyId, fatherId: { in: personIds } },
      data: { fatherId: null },
    });
    await transaction.person.updateMany({
      where: { familyId, motherId: { in: personIds } },
      data: { motherId: null },
    });
    await transaction.person.updateMany({
      where: { familyId, worshipKeeperId: { in: personIds } },
      data: { worshipKeeperId: null },
    });
    await transaction.media.updateMany({
      where: { familyId, personId: { in: personIds } },
      data: { personId: null },
    });
    await transaction.relationship.deleteMany({
      where: {
        familyId,
        OR: [{ husbandId: { in: personIds } }, { wifeId: { in: personIds } }],
      },
    });
  }

  private async validateParents(
    transaction: Prisma.TransactionClient,
    familyId: string,
    personId: string | null,
    fatherId: string | null,
    motherId: string | null,
  ): Promise<void> {
    if (fatherId && motherId && fatherId === motherId) {
      throw new BadRequestException('Cha và mẹ phải là hai thành viên khác nhau.');
    }
    if (personId && (personId === fatherId || personId === motherId)) {
      throw new BadRequestException('Một thành viên không thể là cha hoặc mẹ của chính mình.');
    }

    const requested = [...new Set([fatherId, motherId].filter((id): id is string => id !== null))];
    if (!requested.length) return;
    const parents = await transaction.person.findMany({
      where: { familyId, id: { in: requested } },
      select: { id: true, gender: true },
    });
    if (parents.length !== requested.length) {
      throw new BadRequestException('Cha và mẹ phải thuộc cùng dòng họ đang quản lý.');
    }
    const parentGenders = new Map(parents.map((parent) => [parent.id, parent.gender]));
    if (fatherId && parentGenders.get(fatherId) !== 'MALE') {
      throw new BadRequestException('Người cha phải có giới tính nam.');
    }
    if (motherId && parentGenders.get(motherId) !== 'FEMALE') {
      throw new BadRequestException('Người mẹ phải có giới tính nữ.');
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
        if (id === personId)
          throw new BadRequestException(
            'Không thể chọn người này làm cha hoặc mẹ vì sẽ tạo vòng lặp gia phả.',
          );
        visited.add(id);
        const person = byId.get(id);
        if (person?.fatherId) pending.push(person.fatherId);
        if (person?.motherId) pending.push(person.motherId);
      }
    }
  }
}
