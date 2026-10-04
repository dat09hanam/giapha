import type { PrismaService } from '../database/prisma.service.js';

/** Family sections the platform admin can switch on or off for the whole platform. */
export const FAMILY_FEATURES = ['feed', 'fund', 'library', 'editSuggestions', 'printBook'] as const;

export type FamilyFeature = (typeof FAMILY_FEATURES)[number];

export type FamilyFeatures = Record<FamilyFeature, boolean>;

/** Every switch, read from `PlatformFeature`; a feature without a row is on. */
export async function readFamilyFeatures(prisma: PrismaService): Promise<FamilyFeatures> {
  const rows = await prisma.platformFeature.findMany({ select: { key: true, enabled: true } });
  const stored = new Map(rows.map((row) => [row.key, row.enabled]));
  return Object.fromEntries(
    FAMILY_FEATURES.map((feature) => [feature, stored.get(feature) ?? true]),
  ) as FamilyFeatures;
}

/** Whether one section is switched on. */
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
