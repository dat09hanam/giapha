import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Noto_Serif } from 'next/font/google';

import { SiteHeader } from '@/components/layout/site-header';
import { ToastProvider } from '@/components/ui/toast';

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
  description: 'Không gian lưu giữ và kết nối câu chuyện của mỗi dòng họ.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${sans.variable} ${serif.variable}`}>
      <head>
        <title>Gia Phả Đời Đời</title>
      </head>
      <body>
        <ToastProvider>
          <SiteHeader />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
