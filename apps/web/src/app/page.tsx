import { HomeLanding } from '@/components/home/home-landing';
import { getPricingPlans } from '@/lib/api';
import type { PricingPlan } from '@/types/pricing';

async function loadPricingPlans(): Promise<PricingPlan[]> {
  try {
    return await getPricingPlans();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  return <HomeLanding pricingPlans={await loadPricingPlans()} />;
}
