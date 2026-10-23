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

type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
} & Record<string, unknown>;

/**
 * The gtag queue: calls made before gtag.js loads wait in `dataLayer` and are sent once it
 * arrives, so this never depends on which runs first. gtag.js needs the `arguments` object
 * itself pushed, hence the plain function.
 */
function gtagOf(win: GtagWindow, measurementId: string): (...args: unknown[]) => void {
  if (!win.gtag) {
    win.dataLayer = win.dataLayer ?? [];
    win.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      win.dataLayer?.push(arguments);
    };
    win.gtag('js', new Date());
    win.gtag('config', measurementId, { send_page_view: false });
  }
  return win.gtag;
}

/** Google Analytics 4: one page view per tracked page, including client-side navigations. */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const tracked = isTracked(pathname);

  useEffect(() => {
    if (!MEASUREMENT_ID) return;
    const win = window as unknown as GtagWindow;
    // Google's own opt-out switch: gtag sends nothing at all (not even its automatic
    // history-based page views) while the visitor is on a private page.
    win[`ga-disable-${MEASUREMENT_ID}`] = !tracked;
    if (!tracked) return;
    gtagOf(win, MEASUREMENT_ID)('event', 'page_view', {
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, tracked]);

  if (!MEASUREMENT_ID || !tracked) return null;
  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
      strategy="afterInteractive"
    />
  );
}
