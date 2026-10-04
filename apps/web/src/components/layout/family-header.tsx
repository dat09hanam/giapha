'use client';

import {
  Bell,
  Info,
  LogIn,
  Menu,
  Network,
  Images,
  Newspaper,
  Wallet,
  Settings,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/ui/button';
import { Presence } from '@/components/ui/presence';
import type { UserRole } from '@/lib/auth-api';
import {
  FAMILY_NAV,
  familyHref,
  isInSection,
  type FamilyNavItem,
  type FamilyNavKey,
} from '@/lib/family-nav';
import { cn } from '@/lib/utils';

export type FamilyHeaderViewer = { id: string; displayName: string; role: UserRole } | null;

const NAV_ICONS: Record<FamilyNavKey, LucideIcon> = {
  tree: Network,
  feed: Newspaper,
  fund: Wallet,
  library: Images,
  announcements: Bell,
  about: Info,
};

function TopNavEntry({
  item,
  slug,
  pathname,
}: {
  item: FamilyNavItem;
  slug: string;
  pathname: string;
}) {
  const base =
    'inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition';

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
  const active = isInSection(pathname, href, item.path);
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

/** One tab of the phone's bottom bar: an icon over a short label, Facebook-style. */
export function BottomTab({
  icon: Icon,
  label,
  active = false,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <span
      className={cn(
        'relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
        active ? 'text-emerald-800' : disabled ? 'text-stone-300' : 'text-stone-500',
      )}
    >
      {active ? (
        <span
          className="absolute inset-x-3 top-0 h-[3px] rounded-b-full bg-emerald-800"
          aria-hidden="true"
        />
      ) : null}
      <span className="relative">
        <Icon className="size-6" strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
        {disabled ? (
          <span
            className="absolute -right-1.5 -top-1 size-2 rounded-full bg-amber-400 ring-2 ring-white"
            aria-hidden="true"
          />
        ) : null}
      </span>
      <span className="max-w-full truncate px-0.5">{label}</span>
    </span>
  );
}

/**
 * A family's navigation. Desktops get a top bar with the family's name; phones
 * and tablets get a bottom tab bar, where the thumb is, and the page itself
 * leaves room for it (see the family layout).
 */
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
  const adminActive = isManager && pathname.startsWith('/admin');
  // The designer brings its own bottom bar of editing tools.
  const inDesigner = pathname.endsWith('/thiet_ke');
  // The phone's bar keeps only sections that work; the others are listed in the menu.
  const available = FAMILY_NAV.filter(
    (item): item is FamilyNavItem & { path: string } => item.path !== null,
  );
  const comingSoon = FAMILY_NAV.filter((item) => item.path === null);
  const loginHref = `/login?next=${encodeURIComponent(familyHref(family.slug, ''))}`;

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
    <>
      <header className="relative z-40 hidden border-b border-emerald-950/10 bg-[#fffdf8]/95 backdrop-blur lg:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-8">
          <Link
            href={familyHref(family.slug, '')}
            className="min-w-0 truncate font-semibold tracking-tight text-emerald-950"
          >
            {family.name}
          </Link>

          <nav className="ml-4 flex items-center gap-1" aria-label="Mục của dòng họ">
            {FAMILY_NAV.map((item) => (
              <TopNavEntry key={item.key} item={item} slug={family.slug} pathname={pathname} />
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {viewer ? (
              <>
                <span
                  className="max-w-40 truncate text-sm font-medium text-emerald-950"
                  title={viewer.displayName}
                >
                  {viewer.displayName}
                </span>
                {isManager ? (
                  <Button asChild variant={adminActive ? 'default' : 'ghost'}>
                    <Link href={adminHref} aria-current={adminActive ? 'page' : undefined}>
                      <Settings className="size-4" aria-hidden="true" />
                      Quản trị
                    </Link>
                  </Button>
                ) : null}
                <LogoutButton />
              </>
            ) : (
              <Button asChild variant="outline">
                <Link href={loginHref}>
                  <LogIn className="size-4" aria-hidden="true" />
                  Đăng nhập
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <Presence>
        {menuOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="ui-backdrop absolute inset-0 bg-stone-950/40"
              aria-label="Đóng menu"
              tabIndex={-1}
              onClick={() => setMenuOpen(false)}
            />
            <section
              id="family-menu"
              aria-label="Menu"
              className="ui-sheet absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] grid gap-1 rounded-t-3xl border-t border-emerald-950/10 bg-[#fffdf8] px-4 pb-4 pt-3 shadow-2xl"
            >
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-stone-300" aria-hidden="true" />
              <p className="truncate px-3 pb-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                {family.name}
              </p>
              {comingSoon.length > 0 ? (
                <div className="mb-1 flex flex-wrap gap-2 px-3 pb-2">
                  {comingSoon.map((item) => {
                    const Icon = NAV_ICONS[item.key];
                    return (
                      <span
                        key={item.key}
                        aria-disabled="true"
                        className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-sm text-stone-500"
                      >
                        <Icon className="size-4" aria-hidden="true" />
                        {item.label}
                        <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-medium text-amber-800">
                          Sắp có
                        </span>
                      </span>
                    );
                  })}
                </div>
              ) : null}
              {viewer ? (
                <>
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-900">
                      <UserRound className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 truncate font-semibold text-emerald-950">
                      {viewer.displayName}
                    </span>
                  </div>
                  <div className="px-3 pt-2 [&>button]:w-full">
                    <LogoutButton />
                  </div>
                </>
              ) : (
                <Button asChild className="w-full">
                  <Link href={loginHref}>
                    <LogIn className="size-4" aria-hidden="true" />
                    Đăng nhập
                  </Link>
                </Button>
              )}
            </section>
          </div>
        ) : null}
      </Presence>

      {inDesigner ? null : (
        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-emerald-950/10 bg-[#fffdf8]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(30,41,35,0.06)] backdrop-blur lg:hidden"
          aria-label="Mục của dòng họ"
        >
          <ul className="mx-auto grid h-16 max-w-xl auto-cols-fr grid-flow-col">
            {available.map((item) => {
              const icon = NAV_ICONS[item.key];
              const href = familyHref(family.slug, item.path);
              const active = !menuOpen && isInSection(pathname, href, item.path);
              return (
                <li key={item.key}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className="block h-full"
                    onClick={() => setMenuOpen(false)}
                  >
                    <BottomTab icon={icon} label={item.label} active={active} />
                  </Link>
                </li>
              );
            })}
            {isManager ? (
              // The clan head's own tab; members never see it.
              <li>
                <Link
                  href={adminHref}
                  aria-current={adminActive && !menuOpen ? 'page' : undefined}
                  className="block h-full"
                  onClick={() => setMenuOpen(false)}
                >
                  <BottomTab icon={Settings} label="Quản trị" active={adminActive && !menuOpen} />
                </Link>
              </li>
            ) : null}
            <li>
              <button
                type="button"
                className="block size-full"
                aria-expanded={menuOpen}
                aria-controls="family-menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <BottomTab icon={menuOpen ? X : Menu} label="Menu" active={menuOpen} />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </>
  );
}
