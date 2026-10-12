import { HomeLanding } from '@/components/home/home-landing';
import { getArticles, getPricingPlans } from '@/lib/api';
import type { ArticleSummary } from '@/types/article';
import type { PricingPlan } from '@/types/pricing';

async function loadPricingPlans(): Promise<PricingPlan[]> {
  try {
    return await getPricingPlans();
  } catch {
    return [];
  }
}

async function loadGuides(): Promise<ArticleSummary[]> {
  try {
    return (await getArticles('LIBRARY')).slice(0, 3);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [pricingPlans, guides] = await Promise.all([loadPricingPlans(), loadGuides()]);
  return <HomeLanding pricingPlans={pricingPlans} guides={guides} />;
}
