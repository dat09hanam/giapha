import type { Metadata } from 'next';

import { SITE_BRAND } from '@/lib/site-brand';

/** Public origin of the website, used for canonical links, the sitemap and robots.txt. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://giaphadoidoi.pro.vn').replace(
  /\/$/,
  '',
);

/** Title shown for the home page and for any page that does not name itself. */
export const SITE_TITLE = `${SITE_BRAND.name} – Lập và lưu giữ gia phả dòng họ trực tuyến`;

const DEFAULT_SHARE_IMAGE = {
  url: '/images/decorations/devices-showcase.jpeg',
  width: 1024,
  height: 572,
  alt: `Giao diện thiết kế cây gia phả trên ${SITE_BRAND.name}`,
};

/** Roughly what Google shows of a description before cutting it off. */
const DESCRIPTION_LENGTH = 155;

/** A page's description shortened for search results: one line, cut at a word, at most ~155 characters. */
export function metaDescription(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= DESCRIPTION_LENGTH) return flat;
  const cut = flat.slice(0, DESCRIPTION_LENGTH - 1);
  const end = cut.lastIndexOf(' ');
  return `${(end > DESCRIPTION_LENGTH - 40 ? cut.slice(0, end) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
}

/** Signed-in areas carry private family data and must stay out of search results. */
export const NO_INDEX: Metadata['robots'] = { index: false, follow: false };

type PageSeo = {
  /** Short page name; the root layout appends the site name. Omit for the home page. */
  title?: string;
  description: string;
  /** Path of the page, used as its canonical address. */
  path: string;
  image?: string | null;
  /** Describes `image` for people and search engines; defaults to the page title. */
  imageAlt?: string;
  article?: { publishedTime: string | null; modifiedTime?: string };
};

/**
 * Metadata for a public, indexable page. Next.js merges `openGraph` and `twitter` shallowly,
 * so every page restates the shared fields instead of relying on the root layout.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  article,
}: PageSeo): Metadata {
  const shareTitle = title ?? SITE_TITLE;
  const images = image ? [{ url: image, alt: imageAlt ?? shareTitle }] : [DEFAULT_SHARE_IMAGE];
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      siteName: SITE_BRAND.name,
      locale: 'vi_VN',
      url: path,
      title: shareTitle,
      description,
      images,
      ...(article
        ? {
            type: 'article',
            ...(article.publishedTime ? { publishedTime: article.publishedTime } : {}),
            ...(article.modifiedTime ? { modifiedTime: article.modifiedTime } : {}),
          }
        : { type: 'website' }),
    },
    twitter: { card: 'summary_large_image', title: shareTitle, description, images },
  };
}

/** Serialises structured data for a `<script type="application/ld+json">` tag. */
export function jsonLd(data: Record<string, unknown>): { __html: string } {
  return {
    __html: JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c'),
  };
}
