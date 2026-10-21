import type { AdminFamily } from '@/lib/family-api';
import type { AmbassadorCommission, Ambassador } from '@/types/ambassador';
import type { ServiceRegistration, ServiceRegistrationStatus } from '@/types/pricing';

/** Days before the end date when a family counts as expiring soon. */
export const EXPIRY_WARNING_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS_SHOWN = 12;

export type MonthCount = { key: string; label: string; count: number };
export type NamedCount = { label: string; count: number };
export type ExpiringFamily = { family: AdminFamily; daysLeft: number };

export type AdminOverview = {
  families: number;
  familiesThisMonth: number;
  familiesLastMonth: number;
  members: number;
  storageMb: number;
  expiring: ExpiringFamily[];
  expiredCount: number;
  openRegistrations: number;
  unseenRegistrations: number;
  activeAmbassadors: number;
  unpaidCommission: number;
  unpaidCommissionCount: number;
  familiesByMonth: MonthCount[];
  registrationsByMonth: MonthCount[];
  familiesByPlan: NamedCount[];
  registrationsByStatus: NamedCount[];
  largestFamilies: NamedCount[];
};

const STATUS_LABELS: Record<ServiceRegistrationStatus, string> = {
  NEW: 'Mới',
  CONTACTED: 'Đã liên hệ',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** The last twelve months, oldest first, each with how many dates fall in it. */
function countByMonth(dates: readonly string[], now: Date): MonthCount[] {
  const months: MonthCount[] = [];
  for (let back = MONTHS_SHOWN - 1; back >= 0; back -= 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - back, 1);
    months.push({
      key: monthKey(month),
      label: `T${month.getMonth() + 1}/${String(month.getFullYear()).slice(2)}`,
      count: 0,
    });
  }
  const byKey = new Map(months.map((month) => [month.key, month]));
  for (const value of dates) {
    const entry = byKey.get(monthKey(new Date(value)));
    if (entry) entry.count += 1;
  }
  return months;
}

function countBy<T>(items: readonly T[], labelOf: (item: T) => string): NamedCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = labelOf(item);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].map(([label, count]) => ({ label, count }));
}

/** Platform figures for the admin home, from the lists the admin page already loads. */
export function buildAdminOverview(input: {
  families: readonly AdminFamily[];
  registrations: readonly ServiceRegistration[];
  ambassadors: readonly Ambassador[];
  commissions: readonly AmbassadorCommission[];
  now?: Date;
}): AdminOverview {
  const now = input.now ?? new Date();
  // The sample family is the platform's own showcase, not a customer.
  const families = input.families.filter((family) => !family.isDemo);
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const expiring: ExpiringFamily[] = [];
  let expiredCount = 0;
  for (const family of families) {
    if (!family.planExpiresAt) continue;
    const daysLeft = Math.ceil((new Date(family.planExpiresAt).getTime() - now.getTime()) / DAY_MS);
    if (family.status === 'EXPIRED' || daysLeft <= 0) expiredCount += 1;
    if (family.status === 'EXPIRED' || daysLeft <= EXPIRY_WARNING_DAYS) {
      expiring.push({ family, daysLeft });
    }
  }
  expiring.sort((a, b) => a.daysLeft - b.daysLeft);

  const unpaid = input.commissions.filter((commission) => commission.paidAt === null);
  const statusOrder = Object.keys(STATUS_LABELS) as ServiceRegistrationStatus[];

  return {
    families: families.length,
    familiesThisMonth: families.filter((family) => monthKey(new Date(family.createdAt)) === thisMonth)
      .length,
    familiesLastMonth: families.filter((family) => monthKey(new Date(family.createdAt)) === lastMonth)
      .length,
    members: families.reduce((total, family) => total + family.memberCount, 0),
    storageMb: families.reduce((total, family) => total + family.storageUsedMb, 0),
    expiring,
    expiredCount,
    openRegistrations: input.registrations.filter(
      (entry) => entry.status === 'NEW' || entry.status === 'CONTACTED',
    ).length,
    unseenRegistrations: input.registrations.filter((entry) => entry.seenAt === null).length,
    activeAmbassadors: input.ambassadors.filter((entry) => entry.status === 'ACTIVE').length,
    unpaidCommission: unpaid.reduce((total, commission) => total + commission.amount, 0),
    unpaidCommissionCount: unpaid.length,
    familiesByMonth: countByMonth(
      families.map((family) => family.createdAt),
      now,
    ),
    registrationsByMonth: countByMonth(
      input.registrations.map((entry) => entry.createdAt),
      now,
    ),
    familiesByPlan: countBy(families, (family) => family.plan.name).sort(
      (a, b) => b.count - a.count,
    ),
    registrationsByStatus: statusOrder.map((status) => ({
      label: STATUS_LABELS[status],
      count: input.registrations.filter((entry) => entry.status === status).length,
    })),
    largestFamilies: [...families]
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 5)
      .map((family) => ({ label: family.name, count: family.memberCount })),
  };
}
