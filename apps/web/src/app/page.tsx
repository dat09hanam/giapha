import type { Metadata } from 'next';

import { HomeLanding } from '@/components/home/home-landing';
import { getArticles, getPricingPlans, getSiteContact } from '@/lib/api';
import { jsonLd, pageMetadata, SITE_URL } from '@/lib/seo';
import { SITE_BRAND } from '@/lib/site-brand';
import type { ArticleSummary } from '@/types/article';
import type { PricingPlan } from '@/types/pricing';
import type { SiteContact } from '@/types/site-contact';

export const metadata: Metadata = pageMetadata({ description: SITE_BRAND.description, path: '/' });

/**
 * Who runs the site, for search engines. `sameAs` lists the brand's social pages from the
 * admin's contact settings, so Google ties them to the site as one brand.
 */
function siteJsonLd(contact: SiteContact | null): { __html: string } {
  const sameAs = contact
    ? [contact.facebookUrl, contact.youtubeUrl, contact.tiktokUrl].filter((url): url is string =>
        Boolean(url),
      )
    : [];
  return jsonLd({
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_BRAND.name,
        url: SITE_URL,
        logo: `${SITE_URL}${SITE_BRAND.logoMarkSrc}`,
        ...(sameAs.length > 0 ? { sameAs } : {}),
        ...(contact
          ? {
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer support',
                telephone: contact.phone,
                email: contact.email,
                availableLanguage: 'vi',
              },
            }
          : {}),
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
}

/** Structured data never blocks the home page: without the contact it is simply left out. */
async function loadSiteContact(): Promise<SiteContact | null> {
  try {
    return await getSiteContact();
  } catch {
    return null;
  }
}

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
  const [pricingPlans, guides, contact] = await Promise.all([
    loadPricingPlans(),
    loadGuides(),
    loadSiteContact(),
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={siteJsonLd(contact)} />
      <HomeLanding pricingPlans={pricingPlans} guides={guides} />
    </>
  );
}
