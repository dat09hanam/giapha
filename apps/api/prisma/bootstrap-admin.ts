import 'dotenv/config';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';

import { hashPassword } from '../src/auth/password.js';

const prisma = new PrismaClient();
const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.@-]*$/;

async function main(): Promise<void> {
  const username = process.env.ADMIN_NICKNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || 'Quản trị hệ thống';

  if (
    !username ||
    username.length < 3 ||
    username.length > 191 ||
    !USERNAME_PATTERN.test(username) ||
    !password ||
    password.length < 10 ||
    !process.env.DATABASE_URL
  ) {
    throw new Error(
      'Cần khai báo ADMIN_NICKNAME, ADMIN_PASSWORD (ít nhất 10 ký tự) và DATABASE_URL.',
    );
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { username },
      select: { id: true, role: true, familyId: true },
    });

    if (user) {
      if (user.role !== UserRole.ADMIN || user.familyId !== null) {
        throw new Error('Không thể nâng tài khoản hiện có thành quản trị viên hệ thống.');
      }
      await transaction.user.update({
        where: { id: user.id },
        data: { passwordHash, displayName, status: UserStatus.ACTIVE },
      });
      return;
    }

    const existingAdmins = await transaction.user.findMany({
      where: { role: UserRole.ADMIN, familyId: null },
      select: { id: true },
      take: 2,
    });
    if (existingAdmins.length > 1) {
      throw new Error(
        'Đã có nhiều quản trị viên; hãy dùng ADMIN_NICKNAME của một tài khoản hiện có.',
      );
    }
    if (existingAdmins[0]) {
      await transaction.user.update({
        where: { id: existingAdmins[0].id },
        data: { username, passwordHash, displayName, status: UserStatus.ACTIVE },
      });
      return;
    }

    await transaction.user.create({
      data: {
        username,
        passwordHash,
        displayName,
        role: UserRole.ADMIN,
        familyId: null,
      },
    });
  });

  console.info('Platform administrator account is ready');
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : 'Platform administrator bootstrap failed',
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
