import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FamilyStatus, PosterDecorationKind, Prisma, UserRole } from '@prisma/client';

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

/** The phả đồ sheet: the chosen library background (null shows plain paper) carries all decoration. */
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
  /** The formatted introduction; null when the clan head has not written one. */
  introduction: RichTextDocument | null;
  deathAnniversaryDay: number | null;
  deathAnniversaryMonth: number | null;
  address: string | null;
  ancestryOrigin: string | null;
  poster: FamilyPoster;
};

/** One email belongs to one account, since Quên mật khẩu finds the account by it. */
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

/** The slug a new Family would get; `withOrigin` when its name and anniversary were already taken. */
export type FamilySlugCheck = { slug: string; available: boolean; withOrigin: boolean };

export type CreatedFamilyResult = {
  family: FamilySummary & { deathAnniversary: string; isDemo: boolean };
  /** Null for the sample family, which the platform admin edits directly. */
  accounts: {
    memberPlus: { role: 'MEMBER_PLUS'; username: string; password: string };
    member: { role: 'MEMBER'; username: string; password: string };
  } | null;
};

@Injectable()
export class FamiliesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getPublicFamily(slug: string): Promise<FamilySummary> {
    const family = await this.prisma.family.findFirst({
      where: { slug, status: FamilyStatus.ACTIVE, deletedAt: null },
      select: familySummarySelect,
    });
    if (!family)
      throw new NotFoundException('Không tìm thấy dòng họ hoặc dòng họ không còn hoạt động.');
    return toFamilySummary(family);
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

    const posterDefaults = await this.defaultPosterDecorations();

    try {
      const family = await this.prisma.$transaction(async (transaction) => {
        // Only one sample family: the admin edits the existing one instead of adding another.
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
            ...posterDefaults,
          },
          select: familySummarySelect,
        });
        // The sample family gets no accounts: the platform admin edits it directly.
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
        family: { ...toFamilySummary(family), deathAnniversary: anniversary.display, isDemo },
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
      // Reached only when another request took the same locator between the check and the insert.
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

  /** What `createFamily` would choose for these inputs, so the form can flag a clash as it is typed. */
  async checkFamilySlug(input: FamilySlugCheckQueryDto): Promise<FamilySlugCheck> {
    const { candidates, free } = await this.findFreeLocator(
      normalizeFamilyName(input.name),
      parseDeathAnniversary(input.deathAnniversary),
      input.ancestryOrigin?.trim() || null,
    );
    // Nothing free: report the most specific path tried, which the admin can still change.
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

  /**
   * The first free locator: name and death anniversary, then with the origin appended. Soft-deleted
   * Families and accounts still hold theirs, so an old link never points at another clan.
   */
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

  /**
   * The introduction and its plain-text `description`. A formatted introduction wins; a plain
   * `description` alone (older clients) clears the formatting so the two never disagree.
   */
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

  /** A new family starts with the first active background. */
  private async defaultPosterDecorations(): Promise<{ posterBackgroundId?: string }> {
    const first = await this.prisma.posterDecoration.findFirst({
      where: { kind: PosterDecorationKind.BACKGROUND, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true },
    });
    return first ? { posterBackgroundId: first.id } : {};
  }

  /** The background the family head sent, checked to be an active library background. */
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
