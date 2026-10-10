// Leaf module: no imports, so plan-rights.ts and family-features.ts can both depend on it
// without an import cycle.
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

export function isFamilyFeature(value: string): value is FamilyFeature {
  return (FAMILY_FEATURES as readonly string[]).includes(value);
}
