import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FamilyStatus, Gender, PosterDecorationKind, Prisma, UserRole } from '@prisma/client';

import { readFamilyFeaturesFor, type FamilyFeatures } from '../common/family-features.js';
import { FAMILY_EXPIRED_MESSAGE, isFamilyExpired, planExpiry } from '../common/family-plan.js';
import { planRightsSelect, resolvePlanRights } from '../common/plan-rights.js';
import { normalizeFamilySlug } from '../common/pipes/family-slug.pipe.js';
import {
  parseRichText,
  readRichText,
  richTextToPlain,
  type RichTextDocument,
} from '../common/validation/rich-text.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  generateClanHeadPassword,
  generateSharedMemberPassword,
  hashPassword,
} from '../auth/password.js';
import {
  posterDecorationSelect,
  toPosterDecorationResponse,
  type PosterDecorationResponse,
} from '../poster-decorations/poster-decoration.types.js';
import type { ChangeFamilyPlanDto } from './dto/change-family-plan.dto.js';
import type { CreateFamilyDto } from './dto/create-family.dto.js';
import type { FamilySlugCheckQueryDto } from './dto/family-slug-check.dto.js';
import type { UpdateFamilyDto } from './dto/update-family.dto.js';
import {
  familyLocatorCandidates,
  generateFamilyUsernames,
  normalizeFamilyName,
  parseDeathAnniversary,
  type DeathAnniversary,
  type FamilyLocator,
} from './family-credentials.js';

export type FamilyPoster = {
  background: PosterDecorationResponse | null;
  leftText: string | null;
  rightText: string | null;
};

export type FamilySummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  introduction: RichTextDocument | null;
  deathAnniversaryDay: number | null;
  deathAnniversaryMonth: number | null;
  address: string | null;
  ancestryOrigin: string | null;
  poster: FamilyPoster;
};

const EMAIL_TAKEN_MESSAGE = 'Email Trưởng họ đã được dùng cho tài khoản khác. Hãy dùng email khác.';

const familySummarySelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  introduction: true,
  deathAnniversaryDay: true,
  deathAnniversaryMonth: true,
  address: true,
  ancestryOrigin: true,
  posterLeftText: true,
  posterRightText: true,
  posterBackground: { select: posterDecorationSelect },
} satisfies Prisma.FamilySelect;

type FamilySummaryRecord = Prisma.FamilyGetPayload<{ select: typeof familySummarySelect }>;

function toFamilySummary(record: FamilySummaryRecord): FamilySummary {
  const { posterBackground, posterLeftText, posterRightText, introduction, ...family } = record;
  return {
    ...family,
    introduction: readRichText(introduction),
    poster: {
      background: posterBackground ? toPosterDecorationResponse(posterBackground) : null,
      leftText: posterLeftText,
      rightText: posterRightText,
    },
  };
}

/** Platform-level facts about a Family for the ADMIN's list; no member or tree data. */
export type AdminFamilyListItem = {
  id: string;
  slug: string;
  name: string;
  status: FamilyStatus;
  isDemo: boolean;
  createdAt: Date;
  planExpiresAt: Date | null;
  memberCount: number;
  managerCount: number;
  plan: {
    id: string;
    name: string;
    durationMonths: number | null;
    maxMembers: number | null;
    maxManagers: number | null;
  };
};

const adminFamilySelect = {
  id: true,
  slug: true,
  name: true,
  status: true,
  isDemo: true,
  createdAt: true,
  planExpiresAt: true,
  plan: { select: { id: true, name: true, ...planRightsSelect } },
  _count: {
    select: { people: true, users: { where: { role: UserRole.MEMBER, isShared: false } } },
  },
} satisfies Prisma.FamilySelect;

function toAdminFamily({
  _count,
  plan,
  ...family
}: Prisma.FamilyGetPayload<{ select: typeof adminFamilySelect }>): AdminFamilyListItem {
  const { durationMonths, maxMembers, maxManagers } = resolvePlanRights(plan.features);
  return {
    ...family,
    memberCount: _count.people,
    managerCount: _count.users,
    plan: { id: plan.id, name: plan.name, durationMonths, maxMembers, maxManagers },
  };
}

const familyPlanStateSelect = {
  id: true,
  isDemo: true,
  status: true,
  planExpiresAt: true,
  plan: { select: planRightsSelect },
} satisfies Prisma.FamilySelect;

type FamilyPlanState = Prisma.FamilyGetPayload<{ select: typeof familyPlanStateSelect }>;

/** Counts only: what the family home shows visitors about the tree, no personal details. */
export type FamilyStats = {
  members: number;
  male: number;
  female: number;
  living: number;
  deceased: number;
  /** Distinct generations recorded on the tree. */
  generations: number;
  firstGeneration: number | null;
  lastGeneration: number | null;
  couples: number;
  /** When anyone on the tree was last added or edited. */
  updatedAt: Date | null;
};

/** The limits a family's own managers need to warn before the API refuses. */
export type FamilyPlanLimits = {
  planName: string;
  maxMembers: number | null;
  maxManagers: number | null;
};

export type FamilySlugCheck = { slug: string; available: boolean; withOrigin: boolean };

export type CreatedFamilyResult = {
  family: FamilySummary & {
    deathAnniversary: string;
    isDemo: boolean;
    plan: { id: string; name: string };
  };
  accounts: {
    memberPlus: { role: 'MEMBER_PLUS'; username: string; password: string };
    member: { role: 'MEMBER'; username: string; password: string };
  } | null;
};

@Injectable()
export class FamiliesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getPublicFamily(slug: string): Promise<FamilySummary> {
    const record = await this.prisma.family.findFirst({
      where: { slug, status: { in: [FamilyStatus.ACTIVE, FamilyStatus.EXPIRED] }, deletedAt: null },
      select: { ...familySummarySelect, status: true, planExpiresAt: true },
    });
    if (!record)
      throw new NotFoundException('Không tìm thấy dòng họ hoặc dòng họ không còn hoạt động.');
    const { status, planExpiresAt, ...family } = record;
    if (isFamilyExpired({ status, planExpiresAt })) {
      throw new ForbiddenException(FAMILY_EXPIRED_MESSAGE);
    }
    return toFamilySummary(family);
  }

  async getStats(familyId: string): Promise<FamilyStats> {
    const [byGender, byAlive, byGeneration, couples, latest] = await Promise.all([
      this.prisma.person.groupBy({
        by: ['gender'],
        where: { familyId },
        _count: { _all: true },
      }),
      this.prisma.person.groupBy({
        by: ['isAlive'],
        where: { familyId },
        _count: { _all: true },
      }),
      this.prisma.person.groupBy({
        by: ['generation'],
        where: { familyId, generation: { not: null } },
      }),
      this.prisma.relationship.count({ where: { familyId } }),
      this.prisma.person.aggregate({ where: { familyId }, _max: { updatedAt: true } }),
    ]);
    const genderCount = (gender: Gender): number =>
      byGender.find((row) => row.gender === gender)?._count._all ?? 0;
    const aliveCount = (alive: boolean): number =>
      byAlive.find((row) => row.isAlive === alive)?._count._all ?? 0;
    const generations = byGeneration
      .map((row) => row.generation)
      .filter((generation): generation is number => generation !== null);
    return {
      members: byGender.reduce((total, row) => total + row._count._all, 0),
      male: genderCount(Gender.MALE),
      female: genderCount(Gender.FEMALE),
      living: aliveCount(true),
      deceased: aliveCount(false),
      generations: generations.length,
      firstGeneration: generations.length ? Math.min(...generations) : null,
      lastGeneration: generations.length ? Math.max(...generations) : null,
      couples,
      updatedAt: latest._max.updatedAt,
    };
  }

  async getPlanLimits(familyId: string): Promise<FamilyPlanLimits> {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { plan: { select: { name: true, ...planRightsSelect } } },
    });
    if (!family) throw new NotFoundException('Không tìm thấy dòng họ.');
    const { maxMembers, maxManagers } = resolvePlanRights(family.plan.features);
    return { planName: family.plan.name, maxMembers, maxManagers };
  }

  async getFamilyFeatures(slug: string): Promise<FamilyFeatures> {
    const family = await this.prisma.family.findFirst({
      where: { slug, status: FamilyStatus.ACTIVE, deletedAt: null },
      select: { id: true },
    });
    if (!family)
      throw new NotFoundException('Không tìm thấy dòng họ hoặc dòng họ không còn hoạt động.');
    return readFamilyFeaturesFor(this.prisma, family.id);
  }

  async listFamilies(): Promise<AdminFamilyListItem[]> {
    const records = await this.prisma.family.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: adminFamilySelect,
    });
    return records.map(toAdminFamily);
  }

  async changePlan(slug: string, input: ChangeFamilyPlanDto): Promise<AdminFamilyListItem> {
    const [family, plan] = await Promise.all([
      this.findFamilyForPlan(slug),
      this.prisma.pricingPlan.findUnique({
        where: { id: input.planId },
        select: { id: true, ...planRightsSelect },
      }),
    ]);
    if (!plan) throw new BadRequestException('Không tìm thấy gói dịch vụ đã chọn.');
    // A new plan is a new purchase: its period starts today.
    return this.setPlanPeriod(family, {
      planId: plan.id,
      planExpiresAt: planExpiry(
        resolvePlanRights(plan.features).durationMonths,
        new Date(),
        family.isDemo,
      ),
    });
  }

  async renewPlan(slug: string): Promise<AdminFamilyListItem> {
    const family = await this.findFamilyForPlan(slug);
    const { durationMonths } = resolvePlanRights(family.plan.features);
    if (durationMonths === null || family.isDemo) {
      throw new BadRequestException('Gói của dòng họ này không có thời hạn nên không cần gia hạn.');
    }
    // Renewing early adds a full period after the current end; a lapsed plan restarts today.
    const now = new Date();
    const from = family.planExpiresAt && family.planExpiresAt > now ? family.planExpiresAt : now;
    return this.setPlanPeriod(family, {
      planExpiresAt: planExpiry(durationMonths, from, false),
    });
  }

  private async findFamilyForPlan(slug: string): Promise<FamilyPlanState> {
    const family = await this.prisma.family.findFirst({
      where: { slug, deletedAt: null },
      select: familyPlanStateSelect,
    });
    if (!family) throw new NotFoundException('Không tìm thấy dòng họ.');
    return family;
  }

  private async setPlanPeriod(
    family: FamilyPlanState,
    data: { planId?: string; planExpiresAt: Date | null },
  ): Promise<AdminFamilyListItem> {
    const record = await this.prisma.family.update({
      where: { id: family.id },
      data: {
        ...data,
        ...(family.status === FamilyStatus.EXPIRED ? { status: FamilyStatus.ACTIVE } : {}),
      },
      select: adminFamilySelect,
    });
    return toAdminFamily(record);
  }

  async createFamily(input: CreateFamilyDto): Promise<CreatedFamilyResult> {
    const name = normalizeFamilyName(input.name);
    const anniversary = parseDeathAnniversary(input.deathAnniversary);
    const ancestryOrigin = input.ancestryOrigin?.trim() || null;
    const isDemo = input.isDemo === true;
    const { slug, usernames } = isDemo
      ? {
          slug: normalizeFamilySlug(input.slug ?? ''),
          usernames: generateFamilyUsernames(name, anniversary),
        }
      : await this.chooseFamilyLocator(name, anniversary, ancestryOrigin);
    const memberPlusPassword = generateClanHeadPassword();
    const memberPassword = generateSharedMemberPassword();
    const [memberPlusPasswordHash, memberPasswordHash] = await Promise.all([
      hashPassword(memberPlusPassword),
      hashPassword(memberPassword),
    ]);

    const headEmail = input.headEmail?.trim().toLowerCase() || null;
    if (headEmail && (await this.prisma.user.count({ where: { email: headEmail } }))) {
      throw new ConflictException(EMAIL_TAKEN_MESSAGE);
    }

    const plan = await this.prisma.pricingPlan.findUnique({
      where: { id: input.planId },
      select: { id: true, name: true, ...planRightsSelect },
    });
    if (!plan) throw new BadRequestException('Không tìm thấy gói dịch vụ đã chọn.');

    const posterDefaults = await this.defaultPosterDecorations();

    try {
      const family = await this.prisma.$transaction(async (transaction) => {
        if (
          isDemo &&
          (await transaction.family.count({ where: { isDemo: true, deletedAt: null } }))
        ) {
          throw new ConflictException('Đã có gia phả mẫu. Hãy chỉnh sửa gia phả mẫu hiện có.');
        }
        const created = await transaction.family.create({
          data: {
            name,
            slug,
            ancestryOrigin,
            deathAnniversaryDay: anniversary.day,
            deathAnniversaryMonth: anniversary.month,
            isDemo,
            planId: plan.id,
            planExpiresAt: planExpiry(
              resolvePlanRights(plan.features).durationMonths,
              new Date(),
              isDemo,
            ),
            ...posterDefaults,
          },
          select: familySummarySelect,
        });
        if (isDemo) return created;
        await transaction.user.createMany({
          data: [
            {
              username: usernames.memberPlus,
              passwordHash: memberPlusPasswordHash,
              mustChangePassword: true,
              displayName: `Trưởng họ - ${name}`,
              email: headEmail,
              role: UserRole.MEMBER_PLUS,
              familyId: created.id,
            },
            {
              username: usernames.member,
              passwordHash: memberPasswordHash,
              isShared: true,
              displayName: `Thành viên - ${name}`,
              role: UserRole.MEMBER,
              familyId: created.id,
            },
          ],
        });
        return created;
      });

      return {
        family: {
          ...toFamilySummary(family),
          deathAnniversary: anniversary.display,
          isDemo,
          plan: { id: plan.id, name: plan.name },
        },
        accounts: isDemo
          ? null
          : {
              memberPlus: {
                role: UserRole.MEMBER_PLUS,
                username: usernames.memberPlus,
                password: memberPlusPassword,
              },
              member: {
                role: UserRole.MEMBER,
                username: usernames.member,
                password: memberPassword,
              },
            },
      };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        if (String(error.meta?.target ?? '').includes('email')) {
          throw new ConflictException(EMAIL_TAKEN_MESSAGE);
        }
        throw new ConflictException(
          'Đường dẫn dòng họ hoặc tên đăng nhập vừa được dùng cho dòng họ khác. Vui lòng thử lại.',
        );
      }
      throw error;
    }
  }

  async checkFamilySlug(input: FamilySlugCheckQueryDto): Promise<FamilySlugCheck> {
    const { candidates, free } = await this.findFreeLocator(
      normalizeFamilyName(input.name),
      parseDeathAnniversary(input.deathAnniversary),
      input.ancestryOrigin?.trim() || null,
    );
    const shown = free ?? candidates[candidates.length - 1]!;
    return { slug: shown.slug, available: free !== null, withOrigin: shown !== candidates[0] };
  }

  private async chooseFamilyLocator(
    name: string,
    anniversary: DeathAnniversary,
    ancestryOrigin: string | null,
  ): Promise<FamilyLocator> {
    const { free } = await this.findFreeLocator(name, anniversary, ancestryOrigin);
    if (free) return free;
    throw new ConflictException(
      ancestryOrigin
        ? 'Đã có dòng họ cùng tên, ngày giỗ và quê quán này. Hãy ghi quê quán cụ thể hơn (phần trước dấu phẩy đầu tiên được dùng cho đường dẫn).'
        : 'Đã có dòng họ cùng tên và ngày giỗ. Hãy nhập quê quán để phân biệt.',
    );
  }

  private async findFreeLocator(
    name: string,
    anniversary: DeathAnniversary,
    ancestryOrigin: string | null,
  ): Promise<{ candidates: FamilyLocator[]; free: FamilyLocator | null }> {
    const candidates = familyLocatorCandidates(name, anniversary, ancestryOrigin);
    const [families, users] = await Promise.all([
      this.prisma.family.findMany({
        where: { slug: { in: candidates.map((candidate) => candidate.slug) } },
        select: { slug: true },
      }),
      this.prisma.user.findMany({
        where: {
          username: {
            in: candidates.flatMap((candidate) => [
              candidate.usernames.memberPlus,
              candidate.usernames.member,
            ]),
          },
        },
        select: { username: true },
      }),
    ]);
    const taken = new Set([
      ...families.map((family) => family.slug),
      ...users.map((user) => user.username),
    ]);
    const free = candidates.find(
      (candidate) =>
        !taken.has(candidate.slug) &&
        !taken.has(candidate.usernames.memberPlus) &&
        !taken.has(candidate.usernames.member),
    );
    return { candidates, free: free ?? null };
  }

  private introductionChange(
    input: UpdateFamilyDto,
  ): Pick<Prisma.FamilyUpdateManyMutationInput, 'introduction' | 'description'> {
    if (input.introduction !== undefined) {
      const document =
        input.introduction === null
          ? null
          : parseRichText(input.introduction, 'Nội dung giới thiệu không hợp lệ.');
      return {
        introduction: document ?? Prisma.DbNull,
        description: document ? richTextToPlain(document) || null : null,
      };
    }
    if (input.description !== undefined) {
      return { introduction: Prisma.DbNull, description: input.description.trim() || null };
    }
    return {};
  }

  async updateFamily(familyId: string, input: UpdateFamilyDto): Promise<FamilySummary> {
    const name = input.name === undefined ? undefined : normalizeFamilyName(input.name);
    if (name !== undefined && name.length < 2) {
      throw new BadRequestException(
        'Tên dòng họ sau khi loại bỏ khoảng trắng phải có ít nhất 2 ký tự.',
      );
    }

    const anniversary =
      input.deathAnniversary === undefined || input.deathAnniversary === null
        ? input.deathAnniversary
        : parseDeathAnniversary(input.deathAnniversary);

    const updated = await this.prisma.family.updateMany({
      where: { id: familyId, status: FamilyStatus.ACTIVE, deletedAt: null },
      data: {
        ...(name === undefined ? {} : { name }),
        ...this.introductionChange(input),
        ...(input.address === undefined ? {} : { address: input.address.trim() || null }),
        ...(input.ancestryOrigin === undefined
          ? {}
          : { ancestryOrigin: input.ancestryOrigin.trim() || null }),
        ...(input.posterLeftText === undefined
          ? {}
          : { posterLeftText: input.posterLeftText?.trim() || null }),
        ...(input.posterRightText === undefined
          ? {}
          : { posterRightText: input.posterRightText?.trim() || null }),
        ...(anniversary === undefined
          ? {}
          : anniversary === null
            ? { deathAnniversaryDay: null, deathAnniversaryMonth: null }
            : {
                deathAnniversaryDay: anniversary.day,
                deathAnniversaryMonth: anniversary.month,
              }),
        ...(await this.posterBackgroundChange(input)),
      },
    });
    if (updated.count !== 1)
      throw new NotFoundException('Không tìm thấy dòng họ hoặc dòng họ không còn hoạt động.');
    return toFamilySummary(
      await this.prisma.family.findUniqueOrThrow({
        where: { id: familyId },
        select: familySummarySelect,
      }),
    );
  }

  private async defaultPosterDecorations(): Promise<{ posterBackgroundId?: string }> {
    const first = await this.prisma.posterDecoration.findFirst({
      where: { kind: PosterDecorationKind.BACKGROUND, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true },
    });
    return first ? { posterBackgroundId: first.id } : {};
  }

  private async posterBackgroundChange(
    input: UpdateFamilyDto,
  ): Promise<{ posterBackgroundId?: string | null }> {
    if (input.posterBackgroundId === undefined) return {};
    const id = input.posterBackgroundId;
    if (id === null) return { posterBackgroundId: null };
    const found = await this.prisma.posterDecoration.findFirst({
      where: { id, kind: PosterDecorationKind.BACKGROUND, isActive: true },
      select: { id: true },
    });
    if (!found) {
      throw new BadRequestException('Hình nền đã chọn không tồn tại hoặc đã bị ẩn.');
    }
    return { posterBackgroundId: id };
  }
}
