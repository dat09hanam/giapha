import type { Metadata } from 'next';

import { SiteHeader } from '@/components/layout/site-header';
import { ToastProvider } from '@/components/ui/toast';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Gia Phả Việt',
    template: '%s | Gia Phả Việt',
  },
  description: 'Không gian lưu giữ và kết nối câu chuyện của mỗi dòng họ.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <ToastProvider>
          <SiteHeader />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
