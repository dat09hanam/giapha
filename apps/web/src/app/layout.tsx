import type { Metadata } from 'next';
import Link from 'next/link';
import { Sprout } from 'lucide-react';

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
          <header className="border-b border-emerald-950/10 bg-[#fffdf8]/85 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-900 text-emerald-50 shadow-sm">
                  <Sprout className="size-5" aria-hidden="true" />
                </span>
                <span>Gia Phả Việt</span>
              </Link>
              <span className="hidden text-sm text-stone-500 sm:inline">
                Mỗi gia đình, một câu chuyện
              </span>
            </div>
          </header>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
