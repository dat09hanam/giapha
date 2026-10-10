import type { PricingFeatureStyle, PricingPlanTone, Prisma } from '@prisma/client';

export const pricingPlanSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  billingPeriod: true,
  icon: true,
  tone: true,
  badge: true,
  isFeatured: true,
  ctaLabel: true,
  ctaHref: true,
  isActive: true,
  sortOrder: true,
  features: {
    select: { id: true, text: true, style: true },
    orderBy: { sortOrder: 'asc' },
  },
} satisfies Prisma.PricingPlanSelect;

export type PricingPlanRecord = Prisma.PricingPlanGetPayload<{ select: typeof pricingPlanSelect }>;

export type PricingPlanFeatureResponse = {
  id: string;
  text: string;
  style: PricingFeatureStyle;
};

export type PricingPlanResponse = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billingPeriod: string | null;
  icon: string;
  tone: PricingPlanTone;
  badge: string | null;
  isFeatured: boolean;
  ctaLabel: string;
  ctaHref: string;
  isActive: boolean;
  sortOrder: number;
  features: PricingPlanFeatureResponse[];
};

export function toPricingPlanResponse(record: PricingPlanRecord): PricingPlanResponse {
  return { ...record, features: record.features.map((feature) => ({ ...feature })) };
}
