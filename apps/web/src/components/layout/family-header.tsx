'use client';

import {
  Bell,
  ChevronRight,
  GitBranch,
  HandHeart,
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

import { Lotus } from '@/components/about/about-art';
import { LogoutButton } from '@/components/auth/logout-button';
import { CloudMotif } from '@/components/layout/page-hero';
import { Button } from '@/components/ui/button';
import { Presence } from '@/components/ui/presence';
import type { UserRole } from '@/lib/auth-api';
import {
  familyHref,
  isInSection,
  type FamilyNavItem,
  type FamilyNavKey,
} from '@/lib/family-nav';
import { cn } from '@/lib/utils';

export type FamilyHeaderViewer = {
  id: string;
  displayName: string;
  role: UserRole;
  /** A member account the clan head put in charge of a chi/nhánh; it edits that in the designer. */
  managesBranches: boolean;
} | null;

const NAV_ICONS: Record<FamilyNavKey, LucideIcon> = {
  tree: Network,
  feed: Newspaper,
  fund: Wallet,
  merit: HandHeart,
  library: Images,
  announcements: Bell,
  about: Info,
};

function SideNavEntry({
  item,
  slug,
  pathname,
}: {
  item: FamilyNavItem;
  slug: string;
  pathname: string;
}) {
  const Icon = NAV_ICONS[item.key];
  const base =
    'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition [&_svg]:size-5 [&_svg]:shrink-0';

  if (item.path === null) {
    return (
      <span
        className={cn(base, 'cursor-not-allowed text-white/45')}
        aria-disabled="true"
        title="Tính năng đang được xây dựng"
      >
        <Icon aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
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
          ? 'bg-amber-50 text-brand-800 shadow-sm'
          : 'text-white/85 hover:bg-white/10 hover:text-white',
      )}
    >
      <Icon aria-hidden="true" />
      <span className="truncate">{item.label}</span>
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
        active ? 'text-brand-700' : disabled ? 'text-stone-300' : 'text-stone-500',
      )}
    >
      {active ? (
        <span
          className="absolute inset-x-3 top-0 h-[3px] rounded-b-full bg-brand-700"
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
 * A family's navigation. Desktops get a red sidebar with the family's name;
 * phones and tablets get a bottom tab bar, where the thumb is. The page leaves
 * room for either (see the family chrome).
 */
export function FamilyHeader({
  family,
  nav,
  viewer,
}: {
  family: { slug: string; name: string };
  /** The sections this family shows, in menu order. */
  nav: readonly FamilyNavItem[];
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
  // The clan head's admin area, or a branch manager's way into the designer.
  const managerLink = isManager
    ? { href: adminHref, label: 'Quản trị', icon: Settings, active: adminActive }
    : viewer?.managesBranches
      ? {
          href: familyHref(family.slug, 'thiet_ke'),
          label: 'Quản lý chi',
          icon: GitBranch,
          active: inDesigner,
        }
      : null;
  // The phone's bar keeps only sections that work; the others are listed in the menu.
  const available = nav.filter(
    (item): item is FamilyNavItem & { path: string } => item.path !== null && !item.menuOnly,
  );
  // The Menu sheet: working sections without a tab, then those still being built.
  const inMenu = nav.filter(
    (item): item is FamilyNavItem & { path: string } => item.path !== null && Boolean(item.menuOnly),
  );
  const comingSoon = nav.filter((item) => item.path === null);
  const inMenuSection = inMenu.some((item) =>
    isInSection(pathname, familyHref(family.slug, item.path), item.path),
  );
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
      {/* From lg: a red sidebar down the left; the page leaves room for it (family chrome). */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col overflow-hidden bg-gradient-to-b from-brand-700 via-brand-800 to-brand-900 text-white shadow-xl lg:flex print:hidden!"
        aria-label="Điều hướng dòng họ"
      >
        <CloudMotif className="pointer-events-none absolute -right-10 top-24 w-48 text-white/[0.07]" />
        <Lotus className="pointer-events-none absolute -bottom-3 -left-4 w-40 opacity-25" />
        <Link
          href={familyHref(family.slug, '')}
          className="relative flex items-center gap-3 px-5 pb-5 pt-6"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 ring-2 ring-amber-300/70">
            <Lotus className="w-8" />
          </span>
          <span className="min-w-0 font-display leading-tight">
            <span className="block text-sm text-amber-100/90">Gia phả</span>
            <span className="block truncate text-lg font-bold" title={family.name}>
              {family.name.replace(/^gia\s+phả\s+/i, '') || family.name}
            </span>
          </span>
        </Link>

        <nav className="relative grid gap-1 px-3" aria-label="Mục của dòng họ">
          {nav.map((item) => (
            <SideNavEntry key={item.key} item={item} slug={family.slug} pathname={pathname} />
          ))}
          {managerLink ? (
            <Link
              href={managerLink.href}
              aria-current={managerLink.active ? 'page' : undefined}
              className={cn(
                'mt-2 flex h-11 items-center gap-3 rounded-xl border-t border-white/10 px-3 text-[15px] font-medium transition',
                managerLink.active
                  ? 'bg-amber-50 text-brand-800 shadow-sm'
                  : 'text-white/85 hover:bg-white/10 hover:text-white',
              )}
            >
              <managerLink.icon className="size-5 shrink-0" aria-hidden="true" />
              {managerLink.label}
            </Link>
          ) : null}
        </nav>

        <div className="relative mt-auto grid gap-3 border-t border-white/10 px-4 py-4">
          {viewer ? (
            <>
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-50 text-brand-700">
                  <UserRound className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold" title={viewer.displayName}>
                    {viewer.displayName}
                  </span>
                  <span className="block text-xs text-white/60">
                    {viewer.role === 'ADMIN'
                      ? 'Quản trị viên'
                      : viewer.role === 'MEMBER_PLUS'
                        ? 'Trưởng họ'
                        : viewer.managesBranches
                          ? 'Quản lý chi'
                          : 'Thành viên'}
                  </span>
                </span>
              </div>
              <div className="[&>button]:h-9 [&>button]:w-full [&>button]:border-white/20 [&>button]:bg-white/10 [&>button]:text-white [&>button]:hover:bg-white/20">
                <LogoutButton />
              </div>
            </>
          ) : (
            <Link
              href={loginHref}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-50 text-sm font-semibold text-brand-800 hover:bg-white"
            >
              <LogIn className="size-4" aria-hidden="true" />
              Đăng nhập
            </Link>
          )}
        </div>
      </aside>

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
              className="ui-sheet absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] grid gap-1 rounded-t-3xl border-t border-line bg-[#fffdf8] px-4 pb-4 pt-3 shadow-2xl"
            >
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-stone-300" aria-hidden="true" />
              <p className="truncate px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                {family.name}
              </p>
              {inMenu.length > 0 ? (
                <ul className="grid">
                  {inMenu.map((item) => {
                    const Icon = NAV_ICONS[item.key];
                    const href = familyHref(family.slug, item.path);
                    const current = isInSection(pathname, href, item.path);
                    return (
                      <li key={item.key}>
                        <Link
                          href={href}
                          aria-current={current ? 'page' : undefined}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition hover:bg-paper',
                            current ? 'bg-brand-50 text-brand-800' : 'text-stone-800',
                          )}
                        >
                          <Icon className="size-5 text-brand-700" aria-hidden="true" />
                          {item.label}
                          <ChevronRight
                            className="ml-auto size-4 text-stone-400"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {comingSoon.length > 0 ? (
                <ul className="mb-2 grid">
                  {comingSoon.map((item) => {
                    const Icon = NAV_ICONS[item.key];
                    return (
                      <li
                        key={item.key}
                        aria-disabled="true"
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-stone-700"
                      >
                        <Icon className="size-5 text-brand-700" aria-hidden="true" />
                        <span className="font-medium">{item.label}</span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          Sắp có
                        </span>
                        <ChevronRight
                          className="ml-auto size-4 text-stone-300"
                          aria-hidden="true"
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {viewer ? (
                <div className="grid gap-3 border-t border-line pt-3">
                  <div className="flex items-center gap-3 px-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
                      <UserRound className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 truncate font-semibold text-stone-900">
                      {viewer.displayName}
                    </span>
                  </div>
                  <div className="px-3 [&>button]:w-full">
                    <LogoutButton />
                  </div>
                </div>
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
          className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-[#fffdf8]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(30,41,35,0.06)] backdrop-blur lg:hidden print:hidden"
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
            {managerLink ? (
              // The clan head's or a branch manager's own tab; other members never see it.
              <li>
                <Link
                  href={managerLink.href}
                  aria-current={managerLink.active && !menuOpen ? 'page' : undefined}
                  className="block h-full"
                  onClick={() => setMenuOpen(false)}
                >
                  <BottomTab
                    icon={managerLink.icon}
                    label={managerLink.label}
                    active={managerLink.active && !menuOpen}
                  />
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
                <BottomTab
                  icon={menuOpen ? X : Menu}
                  label="Menu"
                  // A section reached from the menu keeps the Menu tab lit.
                  active={menuOpen || inMenuSection}
                />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </>
  );
}
