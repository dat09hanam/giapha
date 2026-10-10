import type { PrismaService } from '../database/prisma.service.js';
import { FAMILY_FEATURES, type FamilyFeature, type FamilyFeatures } from './family-feature-keys.js';
import { planRightsSelect, resolvePlanRights } from './plan-rights.js';

export {
  FAMILY_FEATURES,
  isFamilyFeature,
  type FamilyFeature,
  type FamilyFeatures,
} from './family-feature-keys.js';

/**
 * What one family may use. Site sections are always on; only the printable book is a plan right,
 * so it follows the family's plan. Moving another section into the plan catalog means gating it
 * here the same way.
 */
export async function readFamilyFeaturesFor(
  prisma: PrismaService,
  familyId: string,
): Promise<FamilyFeatures> {
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { plan: { select: planRightsSelect } },
  });
  const rights = family ? resolvePlanRights(family.plan.features) : null;
  return Object.fromEntries(
    FAMILY_FEATURES.map((feature) => [
      feature,
      feature !== 'printBook' || rights?.printBook === true,
    ]),
  ) as FamilyFeatures;
}

export async function isFamilyFeatureOn(
  prisma: PrismaService,
  familyId: string,
  feature: FamilyFeature,
): Promise<boolean> {
  return (await readFamilyFeaturesFor(prisma, familyId))[feature];
}
