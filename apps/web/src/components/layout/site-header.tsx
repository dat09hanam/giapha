'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LogoMark } from '@/components/layout/logo-mark';
import { SiteHeaderContent } from '@/components/layout/site-header-content';
import { isFamilyAdminRoute, isFamilyRoute } from '@/lib/family-nav';
import { SITE_BRAND } from '@/lib/site-brand';

/** Public-site pages that wear the home page's masthead (HomeHeader) instead. */
const PUBLIC_SITE_SECTIONS = ['/gia-pha-mau', '/mau-bai-cung', '/thu-vien'];

/**
 * The platform header; family pages and the clan head's admin pages draw the family's instead,
 * the login page is full-screen with its own way home, and the public site's sections wear
 * its masthead (HomeHeader).
 */
export function SiteHeader() {
  const pathname = usePathname();
  const hidden =
    pathname === '/login' ||
    PUBLIC_SITE_SECTIONS.some(
      (section) => pathname === section || pathname.startsWith(`${section}/`),
    ) ||
    isFamilyRoute(pathname) ||
    isFamilyAdminRoute(pathname);
  return hidden ? null : <SiteHeaderBar />;
}

/** The platform header bar itself, also used under a family path that has no family. */
export function SiteHeaderBar() {
  return (
    <header className="border-b border-gold-500/30 bg-paper/90 shadow-[0_8px_24px_-22px_rgba(74,46,18,0.8)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label={`${SITE_BRAND.name} — Trang chủ`}
          className="flex items-center gap-2.5 font-display text-lg font-bold text-wood-700"
        >
          <span className="grid size-10 place-items-center rounded-full border-2 border-wood-700 bg-[#fffaf0] shadow-sm ring-2 ring-gold-100">
            <LogoMark className="size-8" />
          </span>
          <span>
            {SITE_BRAND.nameLead} <span className="text-brand-700">{SITE_BRAND.nameAccent}</span>
          </span>
        </Link>
        <SiteHeaderContent />
      </div>
    </header>
  );
}
