import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FamilyStatus, Prisma, UserRole } from '@prisma/client';

import { normalizeFamilySlug } from '../common/pipes/family-slug.pipe.js';
import { PrismaService } from '../database/prisma.service.js';
import { hashPassword } from '../auth/password.js';
import type { CreateFamilyDto } from './dto/create-family.dto.js';
import type { UpdateFamilyDto } from './dto/update-family.dto.js';
import {
  generateFamilyUsernames,
  normalizeFamilyName,
  parseDeathAnniversary,
} from './family-credentials.js';

export type FamilySummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  deathAnniversaryDay: number | null;
  deathAnniversaryMonth: number | null;
  address: string | null;
  ancestryOrigin: string | null;
};

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
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        deathAnniversaryDay: true,
        deathAnniversaryMonth: true,
        address: true,
        ancestryOrigin: true,
      },
    });
    if (!family)
      throw new NotFoundException('Không tìm thấy dòng họ hoặc dòng họ không còn hoạt động.');
    return family;
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

    try {
      const family = await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.family.create({
          data: {
            name,
            slug,
            deathAnniversaryDay: anniversary.day,
            deathAnniversaryMonth: anniversary.month,
          },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            deathAnniversaryDay: true,
            deathAnniversaryMonth: true,
            address: true,
            ancestryOrigin: true,
          },
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
        family: { ...family, deathAnniversary: anniversary.display },
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
      },
    });
    if (updated.count !== 1)
      throw new NotFoundException('Không tìm thấy dòng họ hoặc dòng họ không còn hoạt động.');
    return this.prisma.family.findUniqueOrThrow({
      where: { id: familyId },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        deathAnniversaryDay: true,
        deathAnniversaryMonth: true,
        address: true,
        ancestryOrigin: true,
      },
    });
  }
}
