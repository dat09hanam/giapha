import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';

import {
  generatePassword,
  generateSharedMemberPassword,
  hashPassword,
} from '../auth/password.js';
import { computeBranchScope } from '../branches/branch-scope.js';
import { PrismaService } from '../database/prisma.service.js';
import { familyNameKey } from '../families/family-credentials.js';
import type {
  CreateFamilyAccountDto,
  SetBranchesDto,
  UpdateFamilyAccountDto,
} from './family-accounts.dto.js';

export type FamilyAccountBranch = { rootPersonId: string; rootName: string };

/** The prefixes `generateFamilyUsernames` puts before a family's shared suffix. */
const SHARED_USERNAME_PREFIX = 'ThanhVien';
const HEAD_USERNAME_PREFIX = 'TruongHo';

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

export type FamilyAccount = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  /** The family's shared member account, whose password cannot be reset. */
  isShared: boolean;
  createdAt: string;
  branches: FamilyAccountBranch[];
};

/** A password is shown once, in the response that set it. */
export type FamilyAccountWithPassword = { account: FamilyAccount; password: string };

const accountSelect = {
  id: true,
  username: true,
  displayName: true,
  role: true,
  status: true,
  isShared: true,
  createdAt: true,
  branches: {
    select: { rootPersonId: true, root: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.UserSelect;

type AccountRecord = Prisma.UserGetPayload<{ select: typeof accountSelect }>;

function toAccount(record: AccountRecord): FamilyAccount {
  return {
    id: record.id,
    username: record.username,
    displayName: record.displayName,
    role: record.role,
    status: record.status,
    isShared: record.isShared,
    createdAt: record.createdAt.toISOString(),
    branches: record.branches.map((branch) => ({
      rootPersonId: branch.rootPersonId,
      rootName: branch.root.name,
    })),
  };
}

/**
 * The family head's accounts page: member accounts and the chi/nhánh each one manages.
 * The head's own account is listed but never changed here.
 */
@Injectable()
export class FamilyAccountsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(familyId: string): Promise<FamilyAccount[]> {
    const accounts = await this.prisma.user.findMany({
      where: { familyId, deletedAt: null },
      select: accountSelect,
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
    return accounts.map(toAccount);
  }

  /**
   * What every account the clan head creates ends with, e.g. `HoPham1503`: the part the family's
   * generated accounts share (`ThanhVienHoPham1503`, `TruongHoHoPham1503`), so it carries the
   * origin when the family needed one and survives a later rename. Families without those accounts
   * fall back to the name and death anniversary.
   */
  async usernameSuffix(familyId: string): Promise<string> {
    const generated = await this.prisma.user.findMany({
      where: { familyId, OR: [{ isShared: true }, { role: UserRole.MEMBER_PLUS }] },
      select: { username: true, isShared: true },
      orderBy: { createdAt: 'asc' },
    });
    for (const [prefix, shared] of [
      [SHARED_USERNAME_PREFIX, true],
      [HEAD_USERNAME_PREFIX, false],
    ] as const) {
      const match = generated.find(
        (user) => user.isShared === shared && user.username.startsWith(prefix),
      );
      if (match && match.username.length > prefix.length) {
        return match.username.slice(prefix.length);
      }
    }
    const family = await this.prisma.family.findUniqueOrThrow({
      where: { id: familyId },
      select: { name: true, deathAnniversaryDay: true, deathAnniversaryMonth: true },
    });
    const anniversary =
      family.deathAnniversaryDay && family.deathAnniversaryMonth
        ? `${pad2(family.deathAnniversaryDay)}${pad2(family.deathAnniversaryMonth)}`
        : '';
    return `${familyNameKey(family.name)}${anniversary}`;
  }

  /**
   * The full username for a typed prefix and whether it is free. Usernames are unique across every
   * family, soft-deleted accounts included, so this looks past the tenant; it reveals only whether
   * the name is taken, never whose it is.
   */
  async checkUsername(
    familyId: string,
    usernamePrefix: string,
  ): Promise<{ username: string; available: boolean }> {
    const username = `${usernamePrefix.trim()}${await this.usernameSuffix(familyId)}`;
    const existing = await this.prisma.user.findFirst({
      where: { username },
      select: { id: true },
    });
    return { username, available: existing === null };
  }

  async create(
    familyId: string,
    input: CreateFamilyAccountDto,
  ): Promise<FamilyAccountWithPassword> {
    const password = generatePassword();
    const username = `${input.usernamePrefix.trim()}${await this.usernameSuffix(familyId)}`;
    try {
      const account = await this.prisma.user.create({
        data: {
          familyId,
          username,
          displayName: input.displayName.trim(),
          passwordHash: await hashPassword(password),
          mustChangePassword: true,
          role: UserRole.MEMBER,
        },
        select: accountSelect,
      });
      return { account: toAccount(account), password };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Tên đăng nhập đã được sử dụng. Hãy chọn tên khác.');
      }
      throw error;
    }
  }

  async update(
    familyId: string,
    userId: string,
    input: UpdateFamilyAccountDto,
  ): Promise<FamilyAccount> {
    await this.findMemberAccount(familyId, userId);
    const displayName = input.displayName?.trim();
    const account = await this.prisma.$transaction(async (transaction) => {
      if (input.status === UserStatus.SUSPENDED) {
        await transaction.authSession.deleteMany({ where: { userId } });
      }
      return transaction.user.update({
        where: { id: userId },
        data: {
          ...(displayName ? { displayName } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        select: accountSelect,
      });
    });
    return toAccount(account);
  }

  /**
   * A generated password the owner must replace on their next sign-in. The shared account gets a
   * new shared password instead, kept as is, since it is shown only once and could otherwise be lost.
   */
  async resetPassword(familyId: string, userId: string): Promise<FamilyAccountWithPassword> {
    const { isShared } = await this.findMemberAccount(familyId, userId);
    const password = isShared ? generateSharedMemberPassword() : generatePassword();
    const passwordHash = await hashPassword(password);
    const account = await this.prisma.$transaction(async (transaction) => {
      // Signs the account out everywhere, so the old password stops working at once.
      await transaction.authSession.deleteMany({ where: { userId } });
      return transaction.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePassword: !isShared },
        select: accountSelect,
      });
    });
    return { account: toAccount(account), password };
  }

  /** Removed for good, so the username can be given out again; sessions and branches go with it. */
  async remove(familyId: string, userId: string): Promise<void> {
    await this.findMemberAccount(familyId, userId);
    await this.prisma.user.delete({ where: { id: userId } });
  }

  /**
   * Replaces the branches an account manages. A branch may not sit inside, or contain, a branch
   * already given to anyone, this account's other choices included.
   */
  async setBranches(
    familyId: string,
    userId: string,
    input: SetBranchesDto,
  ): Promise<FamilyAccount> {
    const { isShared } = await this.findMemberAccount(familyId, userId);
    const rootIds = [...new Set(input.rootPersonIds)];
    // The whole clan signs in with the shared account, so it must never edit a branch. Clearing
    // stays allowed, for branches given to it before this rule.
    if (isShared && rootIds.length > 0) {
      throw new BadRequestException('Không thể giao chi/nhánh cho tài khoản dùng chung.');
    }

    const account = await this.prisma.$transaction(
      async (transaction) => {
        const [people, relationships, others] = await Promise.all([
          transaction.person.findMany({
            where: { familyId },
            select: { id: true, name: true, fatherId: true, motherId: true },
          }),
          transaction.relationship.findMany({
            where: { familyId },
            select: { husbandId: true, wifeId: true },
          }),
          transaction.branchManager.findMany({
            where: { familyId, userId: { not: userId } },
            select: { rootPersonId: true, user: { select: { displayName: true } } },
          }),
        ]);
        const nameById = new Map(people.map((person) => [person.id, person.name]));
        if (rootIds.some((id) => !nameById.has(id))) {
          throw new BadRequestException(
            'Thành viên được chọn làm gốc chi không thuộc dòng họ này.',
          );
        }

        const claimed = others.map((other) => ({
          rootId: other.rootPersonId,
          owner: `tài khoản ${other.user.displayName}`,
        }));
        const scopeOf = (rootId: string): Set<string> =>
          computeBranchScope(people, relationships, [rootId]).editable;
        for (const [index, rootId] of rootIds.entries()) {
          const scope = scopeOf(rootId);
          const candidates = [
            ...claimed,
            ...rootIds
              .slice(0, index)
              .map((id) => ({ rootId: id, owner: 'lựa chọn khác của bạn' })),
          ];
          for (const other of candidates) {
            if (scope.has(other.rootId) || scopeOf(other.rootId).has(rootId)) {
              throw new ConflictException(
                `Chi của ${nameById.get(rootId)} trùng với chi của ${nameById.get(other.rootId) ?? 'một thành viên'} (${other.owner}). Mỗi chi chỉ do một người quản lý.`,
              );
            }
          }
        }

        await transaction.branchManager.deleteMany({ where: { familyId, userId } });
        if (rootIds.length) {
          await transaction.branchManager.createMany({
            data: rootIds.map((rootPersonId) => ({ familyId, userId, rootPersonId })),
          });
        }
        return transaction.user.findUniqueOrThrow({ where: { id: userId }, select: accountSelect });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return toAccount(account);
  }

  /** Only member accounts of this family are managed here, never the family head's own. */
  private async findMemberAccount(
    familyId: string,
    userId: string,
  ): Promise<{ isShared: boolean }> {
    const account = await this.prisma.user.findFirst({
      where: { id: userId, familyId, deletedAt: null },
      select: { role: true, isShared: true },
    });
    if (!account) throw new NotFoundException('Không tìm thấy tài khoản trong dòng họ này.');
    if (account.role !== UserRole.MEMBER) {
      throw new BadRequestException('Chỉ quản lý được tài khoản thành viên tại đây.');
    }
    return { isShared: account.isShared };
  }
}
