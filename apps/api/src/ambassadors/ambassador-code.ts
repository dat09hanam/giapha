import { randomInt } from 'node:crypto';

import { BadRequestException } from '@nestjs/common';
import {
  AmbassadorStatus,
  type AmbassadorCommissionKind,
  type Prisma,
  type PrismaClient,
} from '@prisma/client';

/** Letters and digits that cannot be misread for one another when typed from an email. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_PREFIX = 'DD';
const CODE_BODY_LENGTH = 6;

/** What a DTO accepts before normalising: the code as people type it. */
export const AMBASSADOR_CODE_PATTERN = /^\s*[A-Za-z0-9]{4,12}\s*$/;
export const AMBASSADOR_CODE_MESSAGE = 'Mã đại sứ gồm 4–12 chữ cái hoặc chữ số.';

const UNKNOWN_CODE = 'Mã đại sứ không tồn tại hoặc đã ngừng hoạt động. Hãy kiểm tra lại.';

type Database = PrismaClient | Prisma.TransactionClient;

export function generateAmbassadorCode(): string {
  let body = '';
  for (let index = 0; index < CODE_BODY_LENGTH; index += 1) {
    body += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return CODE_PREFIX + body;
}

export function normalizeAmbassadorCode(code: string | null | undefined): string | null {
  const normalized = code?.trim().toUpperCase();
  return normalized ? normalized : null;
}

/** The active ambassador owning `code`; an unknown or suspended code is refused. */
export async function findActiveAmbassadorId(
  database: Database,
  code: string | null | undefined,
): Promise<string | null> {
  const normalized = normalizeAmbassadorCode(code);
  if (!normalized) return null;
  const ambassador = await database.ambassador.findFirst({
    where: { code: normalized, status: AmbassadorStatus.ACTIVE },
    select: { id: true },
  });
  if (!ambassador) throw new BadRequestException(UNKNOWN_CODE);
  return ambassador.id;
}

/** What a plan earns its ambassador: a percent of its price, rounded to the đồng. */
export function commissionAmountFor(price: number, percent: number): number {
  return Math.round((price * percent) / 100);
}

/**
 * Records what a referred family's plan earns its ambassador. Plans without a commission earn
 * nothing and leave no row; a suspended ambassador earns nothing either.
 */
export async function recordAmbassadorCommission(
  database: Prisma.TransactionClient,
  input: {
    ambassadorId: string | null;
    family: { id: string; name: string };
    plan: { id: string; name: string; price: number; commissionPercent: number };
    kind: AmbassadorCommissionKind;
  },
): Promise<void> {
  const { ambassadorId, family, plan, kind } = input;
  const amount = commissionAmountFor(plan.price, plan.commissionPercent);
  if (!ambassadorId || amount <= 0) return;
  const active = await database.ambassador.count({
    where: { id: ambassadorId, status: AmbassadorStatus.ACTIVE },
  });
  if (!active) return;
  await database.ambassadorCommission.create({
    data: {
      ambassadorId,
      familyId: family.id,
      familyName: family.name,
      planId: plan.id,
      planName: plan.name,
      kind,
      planPrice: plan.price,
      percent: plan.commissionPercent,
      amount,
    },
    select: { id: true },
  });
}
