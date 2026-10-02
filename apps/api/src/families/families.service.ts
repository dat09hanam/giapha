import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FamilyStatus, PosterDecorationKind, Prisma, UserRole } from '@prisma/client';

import { normalizeFamilySlug } from '../common/pipes/family-slug.pipe.js';
import { PrismaService } from '../database/prisma.service.js';
import { hashPassword } from '../auth/password.js';
import {
  posterDecorationSelect,
  toPosterDecorationResponse,
  type PosterDecorationResponse,
} from '../poster-decorations/poster-decoration.types.js';
import type { CreateFamilyDto } from './dto/create-family.dto.js';
import type { UpdateFamilyDto } from './dto/update-family.dto.js';
import {
  generateFamilyUsernames,
  normalizeFamilyName,
  parseDeathAnniversary,
} from './family-credentials.js';

/** The phả đồ sheet: the chosen library background (null shows plain paper) carries all decoration. */
export type FamilyPoster = {
  background: PosterDecorationResponse | null;
};

export type FamilySummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  deathAnniversaryDay: number | null;
  deathAnniversaryMonth: number | null;
  address: string | null;
  ancestryOrigin: string | null;
  poster: FamilyPoster;
};

const familySummarySelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  deathAnniversaryDay: true,
  deathAnniversaryMonth: true,
  address: true,
  ancestryOrigin: true,
  posterBackground: { select: posterDecorationSelect },
} satisfies Prisma.FamilySelect;

type FamilySummaryRecord = Prisma.FamilyGetPayload<{ select: typeof familySummarySelect }>;

function toFamilySummary(record: FamilySummaryRecord): FamilySummary {
  const { posterBackground, ...family } = record;
  return {
    ...family,
    poster: {
      background: posterBackground ? toPosterDecorationResponse(posterBackground) : null,
    },
  };
}

export type CreatedFamilyResult = {
  family: FamilySummary & { deathAnniversary: string };
  accounts: {
    memberPlus: { role: 'MEMBER_PLUS'; username: string; password: string };
    member: { role: 'MEMBER'; username: string; password: string };
  };
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
    const slug = normalizeFamilySlug(input.slug);
    const anniversary = parseDeathAnniversary(input.deathAnniversary);
    const usernames = generateFamilyUsernames(name, anniversary);
    const [memberPlusPasswordHash, memberPasswordHash] = await Promise.all([
      hashPassword(usernames.memberPlus),
      hashPassword(usernames.member),
    ]);

    const posterDefaults = await this.defaultPosterDecorations();

    try {
      const family = await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.family.create({
          data: {
            name,
            slug,
            deathAnniversaryDay: anniversary.day,
            deathAnniversaryMonth: anniversary.month,
            ...posterDefaults,
          },
          select: familySummarySelect,
        });
        await transaction.user.createMany({
          data: [
            {
              username: usernames.memberPlus,
              passwordHash: memberPlusPasswordHash,
              displayName: `Trưởng họ - ${name}`,
              role: UserRole.MEMBER_PLUS,
              familyId: created.id,
            },
            {
              username: usernames.member,
              passwordHash: memberPasswordHash,
              displayName: `Thành viên - ${name}`,
              role: UserRole.MEMBER,
              familyId: created.id,
            },
          ],
        });
        return created;
      });

      return {
        family: { ...toFamilySummary(family), deathAnniversary: anniversary.display },
        accounts: {
          memberPlus: {
            role: UserRole.MEMBER_PLUS,
            username: usernames.memberPlus,
            password: usernames.memberPlus,
          },
          member: {
            role: UserRole.MEMBER,
            username: usernames.member,
            password: usernames.member,
          },
        },
      };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'Đường dẫn dòng họ hoặc tên đăng nhập được tạo tự động đã tồn tại.',
        );
      }
      throw error;
    }
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
        ...(input.description === undefined
          ? {}
          : { description: input.description.trim() || null }),
        ...(input.address === undefined ? {} : { address: input.address.trim() || null }),
        ...(input.ancestryOrigin === undefined
          ? {}
          : { ancestryOrigin: input.ancestryOrigin.trim() || null }),
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
