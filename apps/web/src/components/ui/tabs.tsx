'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type TabItem = {
  id: string;
  label: string;
  /** Shown on phones, where every tab shares one row; defaults to `label`. */
  shortLabel?: string;
  icon?: ReactNode;
  /** A count that wants attention, such as unread items; hidden when zero. */
  badge?: number;
  content: ReactNode;
};

/**
 * Splits a page into sections. Every panel stays mounted so unsaved form input
 * survives switching tabs, and the open tab is kept in the URL hash so a
 * reload or shared link opens the same section.
 */
export function Tabs({
  tabs,
  label,
  actions,
}: {
  tabs: readonly TabItem[];
  label: string;
  /** Page buttons on the tab row from lg; above the tabs on narrower screens. */
  actions?: ReactNode;
}) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '');
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const tabIds = tabs.map((tab) => tab.id).join(' ');

  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (tabIds.split(' ').includes(fromHash)) setActiveId(fromHash);
  }, [tabIds]);

  function open(id: string): void {
    setActiveId(id);
    window.history.replaceState(null, '', `#${id}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const index = tabs.findIndex((tab) => tab.id === activeId);
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (offset === 0 || index < 0) return;
    event.preventDefault();
    const next = tabs[(index + offset + tabs.length) % tabs.length];
    if (!next) return;
    open(next.id);
    tabRefs.current.get(next.id)?.focus();
  }

  return (
    <div className="grid min-w-0 gap-6">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Phones: equal columns, icon over a short label. From sm: a row of pills. */}
        <div
          role="tablist"
          aria-label={label}
          onKeyDown={handleKeyDown}
          className="grid w-full auto-cols-fr grid-flow-col gap-1 rounded-xl border border-gold-500/30 bg-paper/85 p-1.5 shadow-sm sm:flex sm:w-fit"
        >
          {tabs.map((tab) => {
            const selected = tab.id === activeId;
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  if (node) tabRefs.current.set(tab.id, node);
                  else tabRefs.current.delete(tab.id);
                }}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => open(tab.id)}
                className={cn(
                  'relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:h-10 sm:flex-row sm:gap-2 sm:whitespace-nowrap sm:px-4 sm:py-0 sm:text-sm [&_svg]:size-5 [&_svg]:shrink-0 sm:[&_svg]:size-4',
                  selected
                    ? 'bg-brand-700 text-white shadow-sm ring-1 ring-brand-900/20'
                    : 'text-stone-600 hover:bg-gold-50 hover:text-wood-800',
                )}
              >
                {tab.icon}
                <span className="max-w-full truncate sm:hidden">{tab.shortLabel ?? tab.label}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge ? (
                  <span
                    className="absolute right-1.5 top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-4 text-white sm:static sm:min-w-5 sm:text-xs sm:leading-5"
                    aria-label={`${tab.badge} mục mới`}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {actions ? (
          <div className="order-first flex shrink-0 gap-2 lg:order-none">{actions}</div>
        ) : null}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== activeId}
          className="min-w-0"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
