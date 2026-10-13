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
  if (line.value === null) return entry.unlimitedText;
  const value =
    entry.unit === 'MB' ? formatMegabytes(line.value) : line.value.toLocaleString('vi-VN');
  return entry.template.replace('{value}', value);
}

/** Same as the API's: MB below 1 GB, GB (one decimal at most) above. */
export function formatMegabytes(megabytes: number): string {
  if (megabytes < 1024) return `${megabytes.toLocaleString('vi-VN')} MB`;
  const gigabytes = Math.round((megabytes / 1024) * 10) / 10;
  return `${gigabytes.toLocaleString('vi-VN')} GB`;
}
