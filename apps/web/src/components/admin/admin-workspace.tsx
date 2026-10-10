'use client';

import { House, Menu, ShieldCheck, UserRound, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

import { LogoutButton } from '@/components/auth/logout-button';
import { Presence } from '@/components/ui/presence';
import { cn } from '@/lib/utils';

export type AdminSection = {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  content: ReactNode;
};

function SectionLinks({
  sections,
  activeId,
  onOpen,
  tone,
}: {
  sections: readonly AdminSection[];
  activeId: string;
  onOpen: (id: string) => void;
  tone: 'wood' | 'paper';
}) {
  return (
    <>
      {sections.map((section) => {
        const active = section.id === activeId;
        return (
          <button
            key={section.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onOpen(section.id)}
            className={cn(
              'relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 [&_svg]:size-5 [&_svg]:shrink-0',
              tone === 'wood'
                ? active
                  ? 'bg-paper font-semibold text-brand-800 shadow-sm ring-1 ring-inset ring-gold-400/40 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-brand-700 focus-visible:ring-gold-200'
                  : 'text-gold-50/85 hover:bg-white/10 hover:text-white focus-visible:ring-gold-200'
                : active
                  ? 'bg-brand-50 font-semibold text-brand-800 focus-visible:ring-brand-700'
                  : 'text-wood-800 hover:bg-gold-50 focus-visible:ring-brand-700',
            )}
          >
            {section.icon}
            <span className="min-w-0 flex-1 truncate">{section.label}</span>
            {section.badge ? (
              <span
                className="min-w-5 rounded-full bg-red-600 px-1.5 text-center text-xs font-semibold leading-5 text-white"
                aria-label={`${section.badge} mục mới`}
              >
                {section.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </>
  );
}

export function AdminWorkspace({
  displayName,
  sections,
}: {
  displayName: string;
  sections: readonly AdminSection[];
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');
  const [menuOpen, setMenuOpen] = useState(false);
  const sectionIds = sections.map((section) => section.id).join(' ');
  const active = sections.find((section) => section.id === activeId);

  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (sectionIds.split(' ').includes(fromHash)) setActiveId(fromHash);
  }, [sectionIds]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);

  function open(id: string): void {
    setActiveId(id);
    setMenuOpen(false);
    window.history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0 });
  }

  const unseen = sections.reduce((total, section) => total + (section.badge ?? 0), 0);

  return (
    <div data-admin-workspace="">
      <aside
        className="heritage-hero fixed inset-y-0 left-0 z-40 hidden w-60 flex-col overflow-hidden rounded-none border-y-0 border-l-0 border-r border-gold-500/30 text-white shadow-xl lg:flex"
        aria-label="Điều hướng quản trị"
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
        <div className="relative flex items-center gap-3 px-5 pb-5 pt-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 ring-2 ring-gold-300/70">
            <ShieldCheck className="size-6 text-gold-100" strokeWidth={1.7} aria-hidden="true" />
          </span>
          <span className="min-w-0 font-display leading-tight">
            <span className="block text-sm text-gold-100/90">Quản trị</span>
            <span className="block truncate text-lg font-bold">Hệ thống</span>
          </span>
        </div>

        <nav className="relative grid gap-1 overflow-y-auto px-3" aria-label="Mục quản trị">
          <SectionLinks sections={sections} activeId={activeId} onOpen={open} tone="wood" />
          <span className="mx-3 my-2 h-px bg-white/10" aria-hidden="true" />
          <Link
            href="/"
            className="flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-gold-50/85 transition hover:bg-white/10 hover:text-white"
          >
            <House className="size-5 shrink-0" aria-hidden="true" />
            Trang chủ
          </Link>
        </nav>

        <div className="relative mt-auto grid gap-3 border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-50 text-brand-700 ring-1 ring-gold-300/50">
              <UserRound className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold" title={displayName}>
                {displayName}
              </span>
              <span className="block text-xs text-white/60">Quản trị hệ thống</span>
            </span>
          </div>
          <div className="[&>button]:h-9 [&>button]:w-full [&>button]:border-white/20 [&>button]:bg-white/10 [&>button]:text-white [&>button]:hover:bg-white/20">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <header className="heritage-hero sticky top-0 z-30 flex h-14 items-center gap-3 rounded-none border-x-0 border-t-0 px-4 text-white lg:hidden">
        <ShieldCheck
          className="size-6 shrink-0 text-gold-200"
          strokeWidth={1.7}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[11px] uppercase tracking-wide text-gold-100/70">
            Quản trị hệ thống
          </span>
          <span className="block truncate font-display font-bold">{active?.label}</span>
        </span>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-controls="admin-menu"
          className="relative grid size-10 place-items-center rounded-full bg-white/10 ring-1 ring-gold-300/40 hover:bg-white/20"
          aria-label="Mở menu quản trị"
        >
          <Menu className="size-5" aria-hidden="true" />
          {unseen > 0 ? (
            <span
              className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-red-600 ring-2 ring-wood-700"
              aria-hidden="true"
            />
          ) : null}
        </button>
      </header>

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
              id="admin-menu"
              aria-label="Menu quản trị"
              className="ui-sheet heritage-panel absolute inset-x-0 bottom-0 grid max-h-[85dvh] gap-1 overflow-y-auto rounded-t-3xl border-x-0 border-b-0 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-1">
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {displayName}
                </p>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="grid size-9 place-items-center rounded-full text-stone-500 hover:bg-stone-100"
                  aria-label="Đóng menu"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              <SectionLinks sections={sections} activeId={activeId} onOpen={open} tone="paper" />
              <span className="mx-3 my-1 h-px bg-gold-500/20" aria-hidden="true" />
              <Link
                href="/"
                className="flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-wood-800 hover:bg-gold-50"
              >
                <House className="size-5 shrink-0" aria-hidden="true" />
                Trang chủ
              </Link>
              <div className="mt-1 [&>button]:w-full">
                <LogoutButton />
              </div>
            </section>
          </div>
        ) : null}
      </Presence>

      <div className="lg:pl-60">
        <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <h1 className="sr-only">Quản trị hệ thống — {active?.label}</h1>
          {sections.map((section) => (
            <div key={section.id} id={`panel-${section.id}`} hidden={section.id !== activeId}>
              {section.content}
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
