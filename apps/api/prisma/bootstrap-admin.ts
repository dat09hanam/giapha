import 'dotenv/config';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';

import { hashPassword } from '../src/auth/password.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || 'Quản trị hệ thống';

  if (!email || !password || password.length < 10 || !process.env.DATABASE_URL) {
    throw new Error('ADMIN_EMAIL, ADMIN_PASSWORD (>= 10 chars), and DATABASE_URL are required');
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { email },
      select: { id: true, role: true, familyId: true },
    });

    if (user) {
      if (user.role !== UserRole.ADMIN || user.familyId !== null) {
        throw new Error('Existing account cannot be promoted to a platform admin');
      }

      await transaction.user.update({
        where: { id: user.id },
        data: { passwordHash, displayName, status: UserStatus.ACTIVE },
      });
      return;
    }

    await transaction.user.create({
      data: {
        email,
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
  .catch(() => {
    console.error('Platform administrator bootstrap failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
