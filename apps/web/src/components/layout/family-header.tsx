'use client';

import {
  Bell,
  CalendarHeart,
  ChevronDown,
  ChevronRight,
  GitBranch,
  HandHeart,
  House,
  Landmark,
  Link2,
  LogIn,
  Menu,
  Network,
  Images,
  Newspaper,
  Palette,
  Wallet,
  Settings,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link, { useLinkStatus } from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { InlineLoader } from '@/components/ui/heritage-loader';
import { GoogleLinkDialog } from '@/components/auth/google-link-dialog';
import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/ui/button';
import { Presence } from '@/components/ui/presence';
import { GOOGLE_CLIENT_ID, type UserRole } from '@/lib/auth-api';
import { familyHref, isInSection, type FamilyNavItem, type FamilyNavKey } from '@/lib/family-nav';
import { FAMILY_ADMIN_SECTIONS } from '@/lib/family-admin-sections';
import { useSectionMenu } from '@/lib/section-menu';
import { cn } from '@/lib/utils';
import { useBodyScrollLock } from '@/lib/use-body-scroll-lock';

export type FamilyHeaderViewer = {
  id: string;
  displayName: string;
  role: UserRole;
  managesBranches: boolean;
  canLinkGoogle: boolean;
} | null;

const NAV_ICONS: Record<FamilyNavKey, LucideIcon> = {
  home: House,
  tree: Network,
  feed: Newspaper,
  fund: Wallet,
  merit: HandHeart,
  library: Images,
  anniversaries: CalendarHeart,
  announcements: Bell,
};

function PendingGlow({ className }: { className: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200',
        pending && 'animate-pulse opacity-100',
        className,
      )}
    />
  );
}

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
    'relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition duration-200 [&_svg]:size-5 [&_svg]:shrink-0';

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
          ? 'bg-paper font-semibold text-brand-800 shadow-sm ring-1 ring-inset ring-gold-400/40 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-brand-700'
          : 'text-gold-50/85 hover:bg-white/10 hover:text-white',
      )}
    >
      <PendingGlow className="rounded-xl bg-white/15" />
      <Icon aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function BottomTab({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  busy = false,
  compact = false,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  busy?: boolean;
  /** Smaller label on narrow phones, for bars with six tabs. */
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        'relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors duration-200',
        compact && 'max-[400px]:text-[10px] max-[400px]:tracking-tight',
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
        {busy ? (
          <InlineLoader className="size-6" />
        ) : (
          <Icon className="size-6" strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
        )}
        {disabled ? (
          <span
            className="absolute -right-1.5 -top-1 size-2 rounded-full bg-amber-400 ring-2 ring-white"
            aria-hidden="true"
          />
        ) : null}
      </span>
      <span className={cn('max-w-full truncate', compact ? 'px-0' : 'px-0.5')}>{label}</span>
    </span>
  );
}

type MenuSection = {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
  href: string;
  current?: boolean;
  onSelect?: () => void;
};

type MenuEntry = {
  key: string;
  label: string;
  icon: ReactNode;
  /** Another page; rows with `onSelect` act in place instead. */
  href?: string;
  onSelect?: () => void;
  current?: boolean;
  badge?: number;
  comingSoon?: boolean;
};

function MenuRow({ entry, onDone }: { entry: MenuEntry; onDone: () => void }) {
  const className = cn(
    'flex min-h-12 w-full min-w-0 items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] [&_svg]:size-5 [&_svg]:shrink-0',
    entry.current
      ? 'bg-brand-50 font-semibold text-brand-800 ring-1 ring-inset ring-brand-200 [&_svg]:text-brand-700'
      : entry.comingSoon
        ? 'text-stone-400 [&_svg]:text-stone-300'
        : 'text-wood-800 hover:bg-gold-50 active:bg-gold-100 [&_svg]:text-wood-600',
  );
  const body = (
    <>
      {entry.icon}
      <span className="min-w-0 flex-1 truncate">{entry.label}</span>
      {entry.comingSoon ? (
        <span className="shrink-0 rounded-full border border-dashed border-stone-300 px-2 text-[11px] font-medium leading-5 text-stone-500">
          Sắp có
        </span>
      ) : null}
      {entry.badge ? (
        <span
          className={cn(
            'min-w-5 shrink-0 rounded-full px-1.5 text-center text-xs font-semibold leading-5',
            'bg-red-600 text-white',
          )}
          aria-label={`${entry.badge} mục mới`}
        >
          {entry.badge}
        </span>
      ) : null}
      {entry.href && !entry.onSelect && !entry.current ? (
        <ChevronRight className="size-4! text-stone-400!" aria-hidden="true" />
      ) : null}
    </>
  );

  if (entry.comingSoon) {
    return (
      <div aria-disabled="true" className={className}>
        {body}
      </div>
    );
  }
  if (entry.onSelect) {
    const select = entry.onSelect;
    return (
      <button
        type="button"
        aria-current={entry.current ? 'page' : undefined}
        onClick={() => {
          select();
          onDone();
        }}
        className={className}
      >
        {body}
      </button>
    );
  }
  return (
    <Link
      href={entry.href ?? '#'}
      aria-current={entry.current ? 'page' : undefined}
      onClick={onDone}
      className={className}
    >
      {body}
    </Link>
  );
}

type ManagerLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  /** Drawn in the brand red, like the "Thiết kế gia phả" button on the family admin page. */
  accent?: boolean;
};

export function FamilyHeader({
  family,
  nav,
  viewer,
  editSuggestions,
}: {
  family: { slug: string; name: string };
  nav: readonly FamilyNavItem[];
  viewer: FamilyHeaderViewer;
  /** Whether the admin page has its "Đề xuất chỉnh sửa" tab. */
  editSuggestions: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const sectionMenu = useSectionMenu();
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [adminGroupOpen, setAdminGroupOpen] = useState(false);
  const canLinkGoogle = Boolean(GOOGLE_CLIENT_ID) && viewer?.canLinkGoogle === true;
  useBodyScrollLock(menuOpen);
  const isManager = viewer?.role === 'MEMBER_PLUS' || viewer?.role === 'ADMIN';
  const adminHref =
    viewer?.role === 'ADMIN' ? '/admin' : `/admin/${encodeURIComponent(family.slug)}`;
  const adminActive = isManager && pathname.startsWith('/admin');
  const inDesigner = pathname.endsWith('/thiet_ke');
  const designerHref = familyHref(family.slug, 'thiet_ke');
  // On the admin page the sections switch tabs in place; elsewhere they link to that tab.
  const menuSections: MenuSection[] | null =
    sectionMenu && adminActive
      ? sectionMenu.items.map((item) => ({
          ...item,
          href: `${adminHref}#${item.id}`,
          current: item.id === sectionMenu.activeId,
          onSelect: () => sectionMenu.open(item.id),
        }))
      : viewer?.role === 'MEMBER_PLUS'
        ? FAMILY_ADMIN_SECTIONS.filter(
            (section) => editSuggestions || section.id !== 'de-xuat',
          ).map((section) => ({
            id: section.id,
            label: section.label,
            icon: <section.icon aria-hidden="true" />,
            href: `${adminHref}#${section.id}`,
          }))
        : null;
  // Management shortcuts below the family sections; the clan head gets the tree designer too.
  const managerLinks: ManagerLink[] = isManager
    ? [
        { href: adminHref, label: 'Quản lý dòng họ', icon: Settings, active: adminActive },
        {
          href: designerHref,
          label: 'Thiết kế gia phả',
          icon: Palette,
          active: inDesigner,
          accent: true,
        },
      ]
    : viewer?.managesBranches
      ? [{ href: designerHref, label: 'Quản lý chi', icon: GitBranch, active: inDesigner }]
      : [];
  const available = nav.filter(
    (item): item is FamilyNavItem & { path: string } => item.path !== null && !item.menuOnly,
  );
  const inMenu = nav.filter(
    (item): item is FamilyNavItem & { path: string } =>
      item.path !== null && Boolean(item.menuOnly),
  );
  const comingSoon = nav.filter((item) => item.path === null);
  const inMenuSection = inMenu.some((item) =>
    isInSection(pathname, familyHref(family.slug, item.path), item.path),
  );
  const loginHref = `/login?next=${encodeURIComponent(familyHref(family.slug, ''))}`;

  const sectionEntries = (ids: readonly string[]): MenuEntry[] =>
    (menuSections ?? [])
      .filter((section) => ids.includes(section.id))
      .map((section) => ({
        key: section.id,
        label: section.label,
        icon: section.icon,
        href: section.href,
        onSelect: section.onSelect,
        current: section.current,
        badge: section.badge,
      }));
  // The tree designer (or a branch manager's "Quản lý chi") leads the menu as its main action.
  const featuredLink = managerLinks.find((link) => link.href === designerHref) ?? null;
  const managerEntries: MenuEntry[] = menuSections
    ? sectionEntries(FAMILY_ADMIN_SECTIONS.map((section) => section.id))
    : managerLinks
        .filter((link) => link !== featuredLink)
        .map((link) => ({
          key: link.href,
          label: link.label,
          icon: <link.icon aria-hidden="true" />,
          href: link.href,
          current: link.active,
        }));
  const menuEntries: MenuEntry[] = [
    ...managerEntries,
    ...inMenu.map((item) => {
      const Icon = NAV_ICONS[item.key];
      const href = familyHref(family.slug, item.path);
      return {
        key: item.key,
        label: item.label,
        icon: <Icon aria-hidden="true" />,
        href,
        current: isInSection(pathname, href, item.path),
      };
    }),
    ...comingSoon.map((item) => {
      const Icon = NAV_ICONS[item.key];
      return {
        key: item.key,
        label: item.label,
        icon: <Icon aria-hidden="true" />,
        comingSoon: true,
      };
    }),
  ];

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
      <aside
        className="heritage-hero fixed inset-y-0 left-0 z-40 hidden w-60 flex-col overflow-hidden rounded-none border-y-0 border-l-0 border-r border-gold-500/30 text-white shadow-xl lg:flex print:hidden!"
        aria-label="Điều hướng dòng họ"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-20 size-72 rounded-full bg-gold-400/10 blur-3xl"
        />
        <Image
          src="/images/decorations/sidebar-ancestral-hall.png"
          alt=""
          aria-hidden="true"
          width={900}
          height={300}
          draggable={false}
          className="pointer-events-none absolute bottom-0 left-0 w-full opacity-20 [mask-image:linear-gradient(to_bottom,transparent,black_40%)]"
        />
        <Link
          href={familyHref(family.slug, '')}
          className="relative flex items-center gap-3 px-5 pb-5 pt-6"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 ring-2 ring-gold-300/70">
            <Landmark className="size-6 text-gold-100" strokeWidth={1.7} aria-hidden="true" />
          </span>
          <span className="min-w-0 font-display leading-tight">
            <span className="block text-sm text-gold-100/90">Gia phả</span>
            <span className="block truncate text-lg font-bold" title={family.name}>
              {family.name.replace(/^gia\s+phả\s+/i, '') || family.name}
            </span>
          </span>
        </Link>

        <nav
          className="relative grid min-h-0 min-w-0 flex-1 grid-cols-1 content-start gap-1 overflow-y-auto overflow-x-hidden px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Mục của dòng họ"
        >
          {nav.map((item) => (
            <SideNavEntry key={item.key} item={item} slug={family.slug} pathname={pathname} />
          ))}
          {managerLinks.length > 0 ? (
            <span className="mx-3 mt-2 h-px bg-white/10" aria-hidden="true" />
          ) : null}
          {managerLinks.map((link) =>
            menuSections && link.href === adminHref ? (
              // The admin sections live here instead of a tab bar; always open on the admin page.
              <div key={link.href} className="mt-1 grid min-w-0 grid-cols-1 gap-0.5">
                <button
                  type="button"
                  aria-expanded={adminActive || adminGroupOpen}
                  disabled={adminActive}
                  onClick={() => setAdminGroupOpen((open) => !open)}
                  className="flex h-11 items-center gap-3 rounded-xl bg-gradient-to-r from-gold-400/25 to-gold-500/10 px-3 text-left text-[15px] font-semibold text-gold-50 ring-1 ring-inset ring-gold-300/60 transition hover:from-gold-400/35 hover:to-gold-500/20 hover:text-white disabled:cursor-default"
                >
                  <link.icon className="size-5 shrink-0 text-gold-300" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{link.label}</span>
                  <ChevronDown
                    className={cn(
                      'size-4 shrink-0 text-gold-300/80 transition-transform duration-200',
                      (adminActive || adminGroupOpen) && 'rotate-180',
                    )}
                    aria-hidden="true"
                  />
                </button>
                {adminActive || adminGroupOpen ? (
                  <ul className="ml-5 grid min-w-0 grid-cols-1 gap-0.5 border-l border-white/15 py-1 pl-2">
                    {menuSections.map((section) => {
                      const className = cn(
                        'relative flex h-10 w-full min-w-0 items-center gap-2.5 rounded-lg px-3 text-left text-sm transition [&_svg]:size-4 [&_svg]:shrink-0',
                        section.current
                          ? 'bg-paper font-semibold text-brand-800 shadow-sm [&_svg]:text-brand-700'
                          : 'text-gold-50/80 hover:bg-white/10 hover:text-white [&_svg]:text-gold-300/80',
                      );
                      const body = (
                        <>
                          {section.icon}
                          <span className="min-w-0 flex-1 truncate">{section.label}</span>
                          {section.badge ? (
                            <span className="min-w-5 rounded-full bg-red-600 px-1.5 text-center text-xs font-semibold leading-5 text-white">
                              {section.badge}
                            </span>
                          ) : null}
                        </>
                      );
                      return (
                        <li key={section.id}>
                          {section.onSelect ? (
                            <button
                              type="button"
                              aria-current={section.current ? 'page' : undefined}
                              onClick={section.onSelect}
                              className={className}
                            >
                              {body}
                            </button>
                          ) : (
                            <Link href={section.href} className={className}>
                              {body}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                aria-current={link.active ? 'page' : undefined}
                className={cn(
                  'group relative mt-1 flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition duration-200',
                  link.active
                    ? 'bg-paper text-brand-800 shadow-sm ring-1 ring-inset ring-gold-400/40 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-brand-700'
                    : link.accent
                      ? 'border border-brand-800/40 bg-brand-700 text-white shadow-[0_8px_18px_-12px_rgba(74,46,18,0.8)] hover:bg-brand-800'
                      : 'bg-gradient-to-r from-gold-400/25 to-gold-500/10 text-gold-50 shadow-[0_0_18px_rgba(212,175,55,0.18)] ring-1 ring-inset ring-gold-300/60 hover:from-gold-400/35 hover:to-gold-500/20 hover:text-white',
                )}
              >
                <PendingGlow className="rounded-xl bg-white/15" />
                <link.icon
                  className={cn(
                    'size-5 shrink-0',
                    link.active ? undefined : link.accent ? 'text-white' : 'text-gold-300',
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{link.label}</span>
                <ChevronRight
                  className={cn(
                    'size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5',
                    link.active
                      ? 'text-brand-700/60'
                      : link.accent
                        ? 'text-white/70'
                        : 'text-gold-300/80',
                  )}
                  aria-hidden="true"
                />
              </Link>
            ),
          )}
        </nav>

        <div className="relative mt-auto grid gap-3 border-t border-white/10 px-4 py-4">
          {viewer ? (
            <>
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-50 text-brand-700 ring-1 ring-gold-300/50">
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
              {canLinkGoogle ? (
                <button
                  type="button"
                  onClick={() => setLinkingGoogle(true)}
                  className="flex h-9 items-center justify-center gap-2 rounded-lg bg-paper text-sm font-semibold text-brand-800 hover:bg-white"
                >
                  <Link2 className="size-4" aria-hidden="true" />
                  Liên kết Google
                </button>
              ) : null}
              <div className="[&>button]:h-9 [&>button]:w-full [&>button]:border-white/20 [&>button]:bg-white/10 [&>button]:text-white [&>button]:hover:bg-white/20">
                <LogoutButton />
              </div>
            </>
          ) : (
            <Link
              href={loginHref}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-gold-300/50 bg-paper text-sm font-semibold text-brand-800 hover:bg-white"
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
              className="ui-backdrop absolute inset-0 bg-stone-950/40 backdrop-blur-[2px]"
              aria-label="Đóng menu"
              tabIndex={-1}
              onClick={() => setMenuOpen(false)}
            />
            <section
              id="family-menu"
              aria-labelledby="family-menu-title"
              className="ui-sheet heritage-panel absolute inset-x-0 overflow-hidden bottom-[calc(4rem+env(safe-area-inset-bottom))] flex max-h-[calc(100dvh-7rem-env(safe-area-inset-bottom))] flex-col rounded-t-3xl border-x-0 border-b-0 shadow-2xl"
            >
              <header className="flex items-center gap-3 border-b border-gold-500/20 py-3 pl-5 pr-3">
                <div className="min-w-0 flex-1">
                  <h2
                    id="family-menu-title"
                    className="font-display text-lg font-bold leading-tight text-brand-950"
                  >
                    {isManager ? 'Quản lý dòng họ' : 'Menu'}
                  </h2>
                  <p className="truncate text-sm text-stone-500">{family.name}</p>
                </div>
                <button
                  type="button"
                  aria-label="Đóng menu"
                  onClick={() => setMenuOpen(false)}
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-gold-500/30 bg-white text-stone-600 transition hover:bg-gold-50 hover:text-wood-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </header>

              <div className="grid min-w-0 grid-cols-1 gap-3 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-4 pt-3">
                {featuredLink ? (
                  <Link
                    href={featuredLink.href}
                    aria-current={featuredLink.active ? 'page' : undefined}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-14 min-w-0 items-center gap-3 rounded-2xl border border-gold-400/60 bg-gradient-to-r from-gold-100 to-gold-50 px-3 text-wood-900 shadow-sm transition hover:from-gold-200/70 hover:to-gold-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-gold-800 shadow-sm ring-1 ring-inset ring-gold-400/50">
                      <featuredLink.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-base font-semibold">
                      {featuredLink.label}
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-gold-700" aria-hidden="true" />
                  </Link>
                ) : null}

                {menuEntries.length > 0 ? (
                  <ul className="grid min-w-0 grid-cols-1 gap-0.5 rounded-2xl border border-gold-500/20 bg-white/80 p-1">
                    {menuEntries.map((entry) => (
                      <li key={entry.key}>
                        <MenuRow entry={entry} onDone={() => setMenuOpen(false)} />
                      </li>
                    ))}
                  </ul>
                ) : null}

                {viewer ? (
                  <div className="grid min-w-0 grid-cols-1 gap-2 rounded-2xl border border-gold-500/20 bg-white/80 p-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-50 text-wood-700 ring-1 ring-inset ring-gold-500/30">
                        <UserRound className="size-5" aria-hidden="true" />
                      </span>
                      {/* Wraps onto a second line: a clan head's name is often long. */}
                      <span className="line-clamp-2 min-w-0 flex-1 break-words text-[15px] font-semibold leading-5 text-stone-900">
                        {viewer.displayName}
                      </span>
                      <div className="shrink-0 [&>button]:h-10">
                        <LogoutButton />
                      </div>
                    </div>
                    {canLinkGoogle ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full"
                        onClick={() => {
                          setMenuOpen(false);
                          setLinkingGoogle(true);
                        }}
                      >
                        <Link2 className="size-4" aria-hidden="true" />
                        Liên kết Google
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <Button asChild className="h-12 w-full">
                    <Link href={loginHref}>
                      <LogIn className="size-4" aria-hidden="true" />
                      Đăng nhập
                    </Link>
                  </Button>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </Presence>

      {linkingGoogle ? <GoogleLinkDialog onClose={() => setLinkingGoogle(false)} /> : null}

      {inDesigner ? null : (
        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-gold-500/30 bg-paper/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(74,46,18,0.08)] lg:hidden print:hidden"
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
                    className="relative block h-full"
                    onClick={() => setMenuOpen(false)}
                  >
                    <PendingGlow className="bg-brand-50" />
                    <BottomTab icon={icon} label={item.label} active={active} />
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                className="block size-full"
                aria-expanded={menuOpen}
                aria-controls="family-menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <BottomTab
                  icon={Menu}
                  label="Menu"
                  active={menuOpen || inMenuSection || managerLinks.some((link) => link.active)}
                />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </>
  );
}
