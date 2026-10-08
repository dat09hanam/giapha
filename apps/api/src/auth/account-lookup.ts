import type { Prisma } from '@prisma/client';

import type { PrismaService } from '../database/prisma.service.js';

/**
 * The account named by its username or its email, as signing in and Quên mật khẩu both accept.
 * A username wins over an email, since usernames may contain `@`; emails are stored lower-case and
 * unique, so at most one account matches either way.
 */
export async function findUserByLogin<S extends Prisma.UserSelect>(
  prisma: PrismaService,
  login: string,
  select: S,
): Promise<Prisma.UserGetPayload<{ select: S }> | null> {
  const value = login.trim();
  // Prisma cannot infer the payload through a generic select, so it is named here.
  type Found = Prisma.UserGetPayload<{ select: S }> | null;
  const byUsername = (await prisma.user.findUnique({ where: { username: value }, select })) as Found;
  if (byUsername || !value.includes('@')) return byUsername;
  return (await prisma.user.findUnique({
    where: { email: value.toLowerCase() },
    select,
  })) as Found;
}
