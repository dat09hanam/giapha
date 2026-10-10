import type { PlanCatalogEntry, PricingPlanFeature } from '@/types/pricing';

/**
 * The catalog itself lives in the API (`GET /pricing-plans/catalog`); this only renders an unsaved
 * line the same way the API renders saved ones, so the editor preview matches the pricing table.
 */
export function planFeatureText(
  catalog: readonly PlanCatalogEntry[],
  line: Pick<PricingPlanFeature, 'key' | 'value'>,
): string {
  const entry = catalog.find((candidate) => candidate.key === line.key);
  if (!entry) return line.key;
  if (entry.kind === 'OPTION') return entry.text;
  return line.value === null
    ? entry.unlimitedText
    : entry.template.replace('{value}', line.value.toLocaleString('vi-VN'));
}
