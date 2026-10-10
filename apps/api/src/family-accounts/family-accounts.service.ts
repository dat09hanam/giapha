import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';

import { generatePassword, generateSharedMemberPassword, hashPassword } from '../auth/password.js';
import { computeBranchScope } from '../branches/branch-scope.js';
import { assertWithinManagerLimit } from '../common/family-plan.js';
import { PrismaService } from '../database/prisma.service.js';
import { familyNameKey } from '../families/family-credentials.js';
import type {
  CreateFamilyAccountDto,
  SetBranchesDto,
  UpdateFamilyAccountDto,
} from './family-accounts.dto.js';

export type FamilyAccountBranch = { rootPersonId: string; rootName: string };

const SHARED_USERNAME_PREFIX = 'ThanhVien';
const HEAD_USERNAME_PREFIX = 'TruongHo';

const EMAIL_TAKEN_MESSAGE = 'Email đã được dùng cho tài khoản khác. Hãy dùng email khác.';

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

export type FamilyAccount = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  isShared: boolean;
  createdAt: string;
  branches: FamilyAccountBranch[];
};

export type FamilyAccountWithPassword = { account: FamilyAccount; password: string };

const accountSelect = {
  id: true,
  username: true,
  displayName: true,
  email: true,
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
    email: record.email,
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
    const email = normalizeEmail(input.email);
    await this.assertEmailFree(email);
    const passwordHash = await hashPassword(password);
    try {
      const account = await this.prisma.$transaction(
        async (transaction) => {
          const created = await transaction.user.create({
            data: {
              familyId,
              username,
              displayName: input.displayName.trim(),
              email,
              passwordHash,
              mustChangePassword: true,
              role: UserRole.MEMBER,
            },
            select: accountSelect,
          });
          await assertWithinManagerLimit(transaction, familyId);
          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return { account: toAccount(account), password };
    } catch (error: unknown) {
      throwIfTaken(error);
      throw error;
    }
  }

  async update(
    familyId: string,
    userId: string,
    input: UpdateFamilyAccountDto,
  ): Promise<FamilyAccount> {
    const { isShared } = await this.findMemberAccount(familyId, userId);
    const displayName = input.displayName?.trim();
    const email = input.email === undefined ? undefined : normalizeEmail(input.email);
    if (email && isShared) {
      throw new BadRequestException('Tài khoản dùng chung không được gắn email.');
    }
    await this.assertEmailFree(email ?? null, userId);
    try {
      const account = await this.prisma.$transaction(async (transaction) => {
        if (input.status === UserStatus.SUSPENDED) {
          await transaction.authSession.deleteMany({ where: { userId } });
        }
        return transaction.user.update({
          where: { id: userId },
          data: {
            ...(displayName ? { displayName } : {}),
            ...(input.status ? { status: input.status } : {}),
            ...(email !== undefined ? { email } : {}),
          },
          select: accountSelect,
        });
      });
      return toAccount(account);
    } catch (error: unknown) {
      throwIfTaken(error);
      throw error;
    }
  }

  async resetPassword(familyId: string, userId: string): Promise<FamilyAccountWithPassword> {
    const { isShared } = await this.findMemberAccount(familyId, userId);
    const password = isShared ? generateSharedMemberPassword() : generatePassword();
    const passwordHash = await hashPassword(password);
    const account = await this.prisma.$transaction(async (transaction) => {
      await transaction.authSession.deleteMany({ where: { userId } });
      return transaction.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePassword: !isShared },
        select: accountSelect,
      });
    });
    return { account: toAccount(account), password };
  }

  async remove(familyId: string, userId: string): Promise<void> {
    await this.findMemberAccount(familyId, userId);
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async setBranches(
    familyId: string,
    userId: string,
    input: SetBranchesDto,
  ): Promise<FamilyAccount> {
    const { isShared } = await this.findMemberAccount(familyId, userId);
    const rootIds = [...new Set(input.rootPersonIds)];
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

  private async assertEmailFree(email: string | null, exceptUserId?: string): Promise<void> {
    if (!email) return;
    const owner = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (owner && owner.id !== exceptUserId) throw new ConflictException(EMAIL_TAKEN_MESSAGE);
  }

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

function normalizeEmail(value: string | undefined): string | null {
  return value?.trim().toLowerCase() || null;
}

function throwIfTaken(error: unknown): void {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    if (String(error.meta?.target ?? '').includes('email')) {
      throw new ConflictException(EMAIL_TAKEN_MESSAGE);
    }
    throw new ConflictException('Tên đăng nhập đã được sử dụng. Hãy chọn tên khác.');
  }
}
