import type { FamilyPlanLimits } from '@/types/pricing';

export type FamilyStorage = {
  planName: string;
  usedMb: number;
  /** Null: the plan has no storage quota. */
  limitMb: number | null;
};

/** From this share of the quota on, the clan head is warned. */
export const STORAGE_WARN_RATIO = 0.85;

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

export function storageLevel(storage: FamilyStorage): StorageLevel {
  const ratio = storageRatio(storage);
  return ratio >= 1 ? 'full' : ratio >= STORAGE_WARN_RATIO ? 'warn' : 'ok';
}
