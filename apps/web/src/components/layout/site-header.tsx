'use client';

import { Sprout } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SiteHeaderContent } from '@/components/layout/site-header-content';
import { isFamilyRoute } from '@/lib/family-nav';

/** The platform header; family pages draw their own family header instead. */
export function SiteHeader() {
  const pathname = usePathname();
  return isFamilyRoute(pathname) ? null : <SiteHeaderBar />;
}

/** The platform header bar itself, also used under a family path that has no family. */
export function SiteHeaderBar() {
  return (
    <header className="border-b border-emerald-950/10 bg-[#fffdf8]/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-900 text-emerald-50 shadow-sm">
            <Sprout className="size-5" aria-hidden="true" />
          </span>
          <span>Gia Phả Việt</span>
        </Link>
        <SiteHeaderContent />
      </div>
    </header>
  );
}
