import type { FamilyPlanLimits } from '@/types/pricing';

export type FamilyStorage = {
  planName: string;
  usedMb: number;
  /** Null: the plan has no storage quota. */
  limitMb: number | null;
};

/** Once this little room is left, the clan head is warned. */
export const STORAGE_WARN_REMAINING_MB = 100;

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
  if (limitMb === null) return 'ok';
  const remainingMb = limitMb - usedMb;
  return remainingMb <= 0 ? 'full' : remainingMb <= STORAGE_WARN_REMAINING_MB ? 'warn' : 'ok';
}
