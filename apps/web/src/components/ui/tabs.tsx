'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type TabItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
};

/**
 * Splits a page into sections. Every panel stays mounted so unsaved form input
 * survives switching tabs, and the open tab is kept in the URL hash so a
 * reload or shared link opens the same section.
 */
export function Tabs({ tabs, label }: { tabs: readonly TabItem[]; label: string }) {
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
    <div className="grid gap-6">
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={handleKeyDown}
        className="flex w-full gap-1 overflow-x-auto rounded-2xl border border-emerald-950/10 bg-white/70 p-1.5 shadow-sm sm:w-fit"
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
                'inline-flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:flex-none [&_svg]:size-4 [&_svg]:shrink-0',
                selected
                  ? 'bg-emerald-900 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-emerald-50 hover:text-emerald-950',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== activeId}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
