'use client';

import { Sprout } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SiteHeaderContent } from '@/components/layout/site-header-content';
import { isFamilyAdminRoute, isFamilyRoute } from '@/lib/family-nav';

/** The platform header; family pages and the clan head's admin pages draw the family's instead. */
export function SiteHeader() {
  const pathname = usePathname();
  return isFamilyRoute(pathname) || isFamilyAdminRoute(pathname) ? null : <SiteHeaderBar />;
}

/** The platform header bar itself, also used under a family path that has no family. */
export function SiteHeaderBar() {
  return (
    <header className="border-b border-gold-500/30 bg-paper/90 shadow-[0_8px_24px_-22px_rgba(74,46,18,0.8)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display text-lg font-bold text-wood-700"
        >
          <span className="grid size-9 place-items-center rounded-full border border-gold-400/70 bg-wood-700 text-gold-100 shadow-sm ring-2 ring-gold-100">
            <Sprout className="size-5" aria-hidden="true" />
          </span>
          <span>
            Gia Phả <span className="text-brand-700">Việt</span>
          </span>
        </Link>
        <SiteHeaderContent />
      </div>
    </header>
  );
}
