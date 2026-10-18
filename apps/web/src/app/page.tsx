import type { Metadata } from 'next';

import { HomeLanding } from '@/components/home/home-landing';
import { getArticles, getPricingPlans } from '@/lib/api';
import { jsonLd, pageMetadata, SITE_URL } from '@/lib/seo';
import { SITE_BRAND } from '@/lib/site-brand';
import type { ArticleSummary } from '@/types/article';
import type { PricingPlan } from '@/types/pricing';

export const metadata: Metadata = pageMetadata({ description: SITE_BRAND.description, path: '/' });

const SITE_JSON_LD = jsonLd({
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_BRAND.name,
      url: SITE_URL,
      logo: `${SITE_URL}${SITE_BRAND.logoMarkSrc}`,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_BRAND.name,
      url: SITE_URL,
      inLanguage: 'vi',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
});

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
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={SITE_JSON_LD} />
      <HomeLanding pricingPlans={pricingPlans} guides={guides} />
    </>
  );
}
