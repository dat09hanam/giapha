import type { PricingFeatureStyle, PricingPlanTone, Prisma } from '@prisma/client';

import { planFeatureText, resolvePlanRights, type PlanRights } from '../common/plan-rights.js';

export const pricingPlanSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  commissionPercent: true,
  billingPeriod: true,
  icon: true,
  tone: true,
  badge: true,
  isFeatured: true,
  ctaLabel: true,
  ctaHref: true,
  isActive: true,
  googleSignup: true,
  sortOrder: true,
  features: {
    select: { id: true, key: true, value: true, style: true },
    orderBy: { sortOrder: 'asc' },
  },
} satisfies Prisma.PricingPlanSelect;

export type PricingPlanRecord = Prisma.PricingPlanGetPayload<{ select: typeof pricingPlanSelect }>;

export type PricingPlanFeatureResponse = {
  id: string;
  key: string;
  value: number | null;
  style: PricingFeatureStyle;
  /** Rendered from the catalog; the web shows it as is. */
  text: string;
};

export type PricingPlanResponse = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  /** Percent of `price` an ambassador earns; 0 means none. Shown on the ambassador page. */
  commissionPercent: number;
  billingPeriod: string | null;
  icon: string;
  tone: PricingPlanTone;
  badge: string | null;
  isFeatured: boolean;
  ctaLabel: string;
  ctaHref: string;
  isActive: boolean;
  /** The plan Google self-service sign-up uses; at most one plan has it. Admin-only setting. */
  googleSignup: boolean;
  sortOrder: number;
  features: PricingPlanFeatureResponse[];
  /** What the lines enforce for a family on this plan. */
  rights: PlanRights;
};

export function toPricingPlanResponse(record: PricingPlanRecord): PricingPlanResponse {
  return {
    ...record,
    features: record.features.map((feature) => ({ ...feature, text: planFeatureText(feature) })),
    rights: resolvePlanRights(record.features),
  };
}
