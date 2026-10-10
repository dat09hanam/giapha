import type { PrismaService } from '../database/prisma.service.js';

export const FAMILY_FEATURES = [
  'feed',
  'fund',
  'merit',
  'library',
  'editSuggestions',
  'printBook',
] as const;

export type FamilyFeature = (typeof FAMILY_FEATURES)[number];

export type FamilyFeatures = Record<FamilyFeature, boolean>;

export async function readFamilyFeatures(prisma: PrismaService): Promise<FamilyFeatures> {
  const rows = await prisma.platformFeature.findMany({ select: { key: true, enabled: true } });
  const stored = new Map(rows.map((row) => [row.key, row.enabled]));
  return Object.fromEntries(
    FAMILY_FEATURES.map((feature) => [feature, stored.get(feature) ?? true]),
  ) as FamilyFeatures;
}

export async function isFamilyFeatureOn(
  prisma: PrismaService,
  feature: FamilyFeature,
): Promise<boolean> {
  const row = await prisma.platformFeature.findUnique({
    where: { key: feature },
    select: { enabled: true },
  });
  return row?.enabled ?? true;
}
