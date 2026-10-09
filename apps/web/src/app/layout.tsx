import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Noto_Serif } from 'next/font/google';

import { SiteHeader } from '@/components/layout/site-header';
import { NavigationProgress } from '@/components/layout/navigation-progress';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { ToastProvider } from '@/components/ui/toast';
import { FormValidation } from '@/components/ui/form-validation';
import { SITE_BRAND } from '@/lib/site-brand';

import './globals.css';

// Self-hosted by Next at build time; the CSS reads them through these variables (globals.css).
const sans = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam',
  display: 'swap',
});

const serif = Noto_Serif({
  subsets: ['vietnamese', 'latin'],
  weight: ['600', '700'],
  variable: '--font-noto-serif',
  display: 'swap',
});

// Every page's tab shows the brand alone, so the title lives in the root layout's <head>
// below rather than in metadata: Next streams metadata and drops the old <title> on each
// navigation, which flashed the URL in the tab. Pages must not set a title of their own.
export const metadata: Metadata = {
  description: SITE_BRAND.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${sans.variable} ${serif.variable}`}>
      <head>
        <title>{SITE_BRAND.name}</title>
      </head>
      <body>
        <FormValidation />
        <NavigationProgress />
        <ToastProvider>
          <ConfirmProvider>
            <SiteHeader />
            {children}
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
