import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Noto_Serif } from 'next/font/google';

import { SiteHeader } from '@/components/layout/site-header';
import { NavigationProgress } from '@/components/layout/navigation-progress';
import { SiteContactProvider } from '@/components/social/site-contact-provider';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { ToastProvider } from '@/components/ui/toast';
import { FormValidation } from '@/components/ui/form-validation';
import { getSiteContact } from '@/lib/api';
import { SITE_TITLE, SITE_URL } from '@/lib/seo';
import { SITE_BRAND } from '@/lib/site-brand';
import { DEFAULT_SITE_CONTACT } from '@/lib/site-contact';
import type { SiteContact } from '@/types/site-contact';

import './globals.css';

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s | ${SITE_BRAND.name}` },
  description: SITE_BRAND.description,
  applicationName: SITE_BRAND.name,
};

/** The contact details never block a page: an unreachable API falls back to the defaults. */
async function loadSiteContact(): Promise<SiteContact> {
  try {
    return await getSiteContact();
  } catch {
    return DEFAULT_SITE_CONTACT;
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const contact = await loadSiteContact();
  return (
    <html lang="vi" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <FormValidation />
        <NavigationProgress />
        <SiteContactProvider contact={contact}>
          <ToastProvider>
            <ConfirmProvider>
              <SiteHeader />
              {children}
            </ConfirmProvider>
          </ToastProvider>
        </SiteContactProvider>
      </body>
    </html>
  );
}
