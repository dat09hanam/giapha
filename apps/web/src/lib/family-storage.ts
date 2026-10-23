import type { FamilyPlanLimits } from '@/types/pricing';

export type FamilyStorage = {
  planName: string;
  usedMb: number;
  /** Null: the plan has no storage quota. */
  limitMb: number | null;
};

/** Share of a plan limit in use from which the clan head is warned it is nearly reached. */
export const USAGE_WARN_RATIO = 0.9;

export type StorageLevel = 'ok' | 'warn' | 'full';

export function toFamilyStorage(limits: FamilyPlanLimits): FamilyStorage {
  return {
    planName: limits.planName,
    usedMb: limits.storageUsedMb,
    limitMb: limits.maxStorageMb,
  };
}

/** Share of the quota in use, capped at 1; 0 for an unlimited plan. */
export function storageRatio({ usedMb, limitMb }: FamilyStorage): number {
  return limitMb === null ? 0 : Math.min(1, usedMb / limitMb);
}

export function storageLevel({ usedMb, limitMb }: FamilyStorage): StorageLevel {
  return usageLevel(usedMb, limitMb);
}

/** How close `used` is to a plan limit; a null limit is never reached. */
export function usageLevel(used: number, limit: number | null): StorageLevel {
  if (limit === null) return 'ok';
  if (used >= limit) return 'full';
  return used >= limit * USAGE_WARN_RATIO ? 'warn' : 'ok';
}
