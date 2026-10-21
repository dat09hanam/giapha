'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect } from 'react';

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Public marketing pages only. Family pages and the admin carry family and member names in
 * their titles and paths, which must not reach a third party.
 */
const TRACKED_PREFIXES = [
  '/thu-vien',
  '/mau-bai-cung',
  '/gia-pha-mau',
  '/dai-su',
  '/dang-ky',
  '/chinh-sach-bao-mat',
  '/quy-dinh-su-dung',
];

function isTracked(pathname: string): boolean {
  return (
    pathname === '/' ||
    TRACKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

type Gtag = (...args: unknown[]) => void;

/** Google Analytics 4, loaded once and fed a page view on every tracked navigation. */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const tracked = isTracked(pathname);

  useEffect(() => {
    if (!MEASUREMENT_ID) return;
    // Google's own opt-out switch: once loaded, gtag sends nothing at all (not even its
    // automatic history-based page views) while the visitor is on a private page.
    (window as unknown as Record<string, unknown>)[`ga-disable-${MEASUREMENT_ID}`] = !tracked;
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    if (!tracked || !gtag) return;
    gtag('event', 'page_view', {
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, tracked]);

  if (!MEASUREMENT_ID || !tracked) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      {/* Page views are sent by the effect above, so the client-side navigations count too. */}
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${MEASUREMENT_ID}',{send_page_view:false});gtag('event','page_view',{page_location:location.href,page_title:document.title});`}
      </Script>
    </>
  );
}
