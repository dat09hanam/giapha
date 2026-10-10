import type { Prisma } from '@prisma/client';

import type { PrismaService } from '../database/prisma.service.js';

export async function findUserByLogin<S extends Prisma.UserSelect>(
  prisma: PrismaService,
  login: string,
  select: S,
): Promise<Prisma.UserGetPayload<{ select: S }> | null> {
  const value = login.trim();
  type Found = Prisma.UserGetPayload<{ select: S }> | null;
  const byUsername = (await prisma.user.findUnique({
    where: { username: value },
    select,
  })) as Found;
  if (byUsername || !value.includes('@')) return byUsername;
  return (await prisma.user.findUnique({
    where: { email: value.toLowerCase() },
    select,
  })) as Found;
}
