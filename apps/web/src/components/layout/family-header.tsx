'use client';

import { LogIn, Menu, Settings, Sprout, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@/lib/auth-api';
import { FAMILY_NAV, familyHref, type FamilyNavItem } from '@/lib/family-nav';
import { cn } from '@/lib/utils';

export type FamilyHeaderViewer = { displayName: string; role: UserRole } | null;

function NavEntry({
  item,
  slug,
  pathname,
  stacked,
}: {
  item: FamilyNavItem;
  slug: string;
  pathname: string;
  stacked: boolean;
}) {
  const base = cn(
    'inline-flex items-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition',
    stacked ? 'h-11 w-full px-3' : 'h-9 px-3',
  );

  if (item.path === null) {
    return (
      <span
        className={cn(base, 'cursor-not-allowed text-stone-400')}
        aria-disabled="true"
        title="Tính năng đang được xây dựng"
      >
        {item.label}
        <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">
          Sắp có
        </span>
      </span>
    );
  }

  const href = familyHref(slug, item.path);
  const active = pathname === href;
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        base,
        active
          ? 'bg-emerald-900 text-white shadow-sm'
          : 'text-stone-700 hover:bg-emerald-50 hover:text-emerald-950',
      )}
    >
      {item.label}
    </Link>
  );
}

/** The header of a family's own pages: the family's name, its sections, and the viewer's account. */
export function FamilyHeader({
  family,
  viewer,
}: {
  family: { slug: string; name: string };
  viewer: FamilyHeaderViewer;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isManager = viewer?.role === 'MEMBER_PLUS' || viewer?.role === 'ADMIN';
  const adminHref =
    viewer?.role === 'ADMIN' ? '/admin' : `/admin/${encodeURIComponent(family.slug)}`;

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);

  return (
    <header className="relative z-40 border-b border-emerald-950/10 bg-[#fffdf8]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href={familyHref(family.slug, '')}
          className="flex min-w-0 items-center gap-2.5 font-semibold tracking-tight text-emerald-950"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-900 text-emerald-50 shadow-sm">
            <Sprout className="size-5" aria-hidden="true" />
          </span>
          <span className="truncate">{family.name}</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Mục của dòng họ">
          {FAMILY_NAV.map((item) => (
            <NavEntry
              key={item.key}
              item={item}
              slug={family.slug}
              pathname={pathname}
              stacked={false}
            />
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {viewer ? (
            <>
              <span
                className="hidden max-w-40 truncate text-sm font-medium text-emerald-950 md:inline"
                title={viewer.displayName}
              >
                {viewer.displayName}
              </span>
              {isManager ? (
                <Button asChild variant="ghost" className="hidden sm:inline-flex">
                  <Link href={adminHref}>
                    <Settings className="size-4" aria-hidden="true" />
                    Quản trị
                  </Link>
                </Button>
              ) : null}
              <LogoutButton compactOnMobile />
            </>
          ) : (
            <Button asChild variant="outline">
              <Link href={`/login?next=${encodeURIComponent(familyHref(family.slug, ''))}`}>
                <LogIn className="size-4" aria-hidden="true" />
                Đăng nhập
              </Link>
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="family-menu"
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id="family-menu"
          className="absolute inset-x-0 top-full grid gap-1 border-b border-emerald-950/10 bg-[#fffdf8] px-4 py-3 shadow-lg sm:px-6 lg:hidden"
          aria-label="Mục của dòng họ"
        >
          {FAMILY_NAV.map((item) => (
            <NavEntry key={item.key} item={item} slug={family.slug} pathname={pathname} stacked />
          ))}
          {isManager ? (
            <Link
              href={adminHref}
              className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-stone-700 hover:bg-emerald-50 sm:hidden"
            >
              <Settings className="size-4" aria-hidden="true" />
              Quản trị
            </Link>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
