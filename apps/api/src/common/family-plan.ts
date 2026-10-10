import { ForbiddenException } from '@nestjs/common';
import { FamilyStatus, UserRole, type Prisma } from '@prisma/client';

import { planRightsSelect, resolvePlanRights } from './plan-rights.js';

export const PLAN_LIMIT_REACHED = 'PLAN_LIMIT_REACHED';

/** A plan cap was hit; the web shows its upgrade dialog for this code. */
export class PlanLimitReachedException extends ForbiddenException {
  constructor(message: string) {
    super({ message, code: PLAN_LIMIT_REACHED });
  }
}

export const FAMILY_EXPIRED_MESSAGE =
  'Gói dịch vụ của dòng họ đã hết hạn. Hãy liên hệ quản trị viên để gia hạn hoặc nâng cấp gói.';

/** When a purchase made at `from` ends; null means it never does. The demo family never expires. */
export function planExpiry(
  durationMonths: number | null,
  from: Date,
  isDemo: boolean,
): Date | null {
  if (isDemo || durationMonths === null) return null;
  const end = new Date(from);
  end.setMonth(end.getMonth() + durationMonths);
  return end;
}

/** True once the plan has run out, even before the expiry sweep has flipped the status. */
export function isFamilyExpired(family: {
  status: FamilyStatus;
  planExpiresAt: Date | null;
}): boolean {
  return (
    family.status === FamilyStatus.EXPIRED ||
    (family.planExpiresAt !== null && family.planExpiresAt.getTime() <= Date.now())
  );
}

/**
 * Keeps one invariant between a plan and its families: a non-demo family has an expiry date
 * exactly when its plan has a duration. Run it in the transaction that changes a plan's lines.
 * A plan that gains a duration starts a period today for families that had none; a plan that
 * becomes permanent clears expiry dates and reopens families locked by expiry. When the plan had
 * and keeps a duration, the period each family already bought is left alone.
 */
export async function syncFamilyExpiryToPlan(
  transaction: Prisma.TransactionClient,
  planId: string,
  durationMonths: number | null,
  now: Date,
): Promise<void> {
  if (durationMonths === null) {
    await transaction.family.updateMany({
      where: { planId, planExpiresAt: { not: null } },
      data: { planExpiresAt: null },
    });
    await transaction.family.updateMany({
      where: { planId, status: FamilyStatus.EXPIRED },
      data: { status: FamilyStatus.ACTIVE },
    });
    return;
  }
  await transaction.family.updateMany({
    where: { planId, isDemo: false, planExpiresAt: null },
    data: { planExpiresAt: planExpiry(durationMonths, now, false) },
  });
}

/** Branch-manager accounts: the personal member accounts a clan head creates. */
export function managerAccountWhere(familyId: string): Prisma.UserWhereInput {
  return { familyId, role: UserRole.MEMBER, isShared: false };
}

/**
 * Refuses creating an account that leaves the family above its plan's manager limit. Call it
 * inside the transaction after the account is written, so the rollback undoes it.
 */
export async function assertWithinManagerLimit(
  transaction: Prisma.TransactionClient,
  familyId: string,
): Promise<void> {
  const family = await transaction.family.findUnique({
    where: { id: familyId },
    select: { plan: { select: { name: true, ...planRightsSelect } } },
  });
  if (!family) return;
  const { maxManagers } = resolvePlanRights(family.plan.features);
  if (maxManagers === null) return;
  const managers = await transaction.user.count({ where: managerAccountWhere(familyId) });
  if (managers > maxManagers) {
    throw new PlanLimitReachedException(
      maxManagers === 0
        ? `Gói “${family.plan.name}” không gồm tài khoản quản trị viên chi. Hãy nâng cấp gói để tạo thêm.`
        : `Gói “${family.plan.name}” chỉ cho phép tối đa ${maxManagers} quản trị viên chi. Hãy nâng cấp gói để tạo thêm.`,
    );
  }
}

/**
 * Refuses a write that leaves the family's tree above its plan's member limit. Call it inside the
 * transaction after the new people are written, so the rollback undoes them.
 */
export async function assertWithinMemberLimit(
  transaction: Prisma.TransactionClient,
  familyId: string,
): Promise<void> {
  const family = await transaction.family.findUnique({
    where: { id: familyId },
    select: { plan: { select: { name: true, ...planRightsSelect } } },
  });
  if (!family) return;
  const { maxMembers } = resolvePlanRights(family.plan.features);
  if (maxMembers === null) return;
  const members = await transaction.person.count({ where: { familyId } });
  if (members > maxMembers) {
    throw new PlanLimitReachedException(
      `Gói “${family.plan.name}” chỉ cho phép tối đa ${maxMembers} thành viên trên cây gia phả. Hãy nâng cấp gói để thêm thành viên.`,
    );
  }
}
