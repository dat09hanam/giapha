import type { ServiceRegistrationStatus } from '@/types/pricing';

/** Used against allowed; a null limit means the plan sets no cap. */
export type PlanUsage = { used: number; limit: number | null };

export type PlanChangeRequest = {
  id: string;
  planId: string | null;
  planName: string;
  status: ServiceRegistrationStatus;
  createdAt: string;
};

/** What a clan head sees about their family's plan. */
export type FamilyPlanOverview = {
  plan: {
    id: string;
    name: string;
    price: number;
    billingPeriod: string | null;
    /** Null: the plan never expires. */
    durationMonths: number | null;
  };
  /** Null: the plan never expires. */
  planExpiresAt: string | null;
  /** Whole days until the plan ends, counted up; null when it never expires. */
  daysLeft: number | null;
  expired: boolean;
  members: PlanUsage;
  managers: PlanUsage;
  /** Megabytes. */
  storageMb: PlanUsage;
  /** The latest request the admin has not finished; null when there is none. */
  pendingRequest: PlanChangeRequest | null;
};

export type PlanChangeInput = {
  planId: string;
  fullName: string;
  phone: string;
  email?: string;
};
