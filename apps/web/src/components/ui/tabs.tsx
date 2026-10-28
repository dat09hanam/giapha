'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { setSectionMenu } from '@/lib/section-menu';
import { cn } from '@/lib/utils';

export type TabItem = {
  id: string;
  label: string;
  shortLabel?: string;
  icon?: ReactNode;
  badge?: number;
  content: ReactNode;
};

export function Tabs({
  tabs,
  label,
  actions,
  menuTitle,
}: {
  tabs: readonly TabItem[];
  label: string;
  actions?: ReactNode;
  /** When set, the tabs move into the site menu (sidebar and phone sheet) under this heading. */
  menuTitle?: string;
}) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '');
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const tabIds = tabs.map((tab) => tab.id).join(' ');

  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (tabIds.split(' ').includes(fromHash)) setActiveId(fromHash);
  }, [tabIds]);

  const open = useCallback((id: string): void => {
    setActiveId(id);
    window.history.replaceState(null, '', `#${id}`);
  }, []);

  useEffect(() => {
    if (!menuTitle) return;
    setSectionMenu({
      title: menuTitle,
      items: tabs.map(({ id, label, icon, badge }) => ({ id, label, icon, badge })),
      activeId,
      open: (id) => {
        open(id);
        window.scrollTo({ top: 0 });
      },
    });
  }, [menuTitle, tabs, activeId, open]);

  useEffect(() => {
    if (!menuTitle) return;
    return () => setSectionMenu(null);
  }, [menuTitle]);

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
      <div
        className={cn(
          'min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between',
          menuTitle ? 'hidden' : 'flex',
        )}
      >
        <div
          role="tablist"
          aria-label={label}
          onKeyDown={handleKeyDown}
          className={cn(
            // Phones get a wrapping grid so every label stays readable instead of truncating in one row.
            'grid w-full gap-1 rounded-xl border border-gold-500/30 bg-paper/85 p-1.5 shadow-sm sm:flex sm:w-fit',
            tabs.length === 4 ? 'grid-cols-2' : 'grid-cols-3',
          )}
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
                  'relative flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:gap-2 sm:whitespace-nowrap sm:rounded-xl sm:px-4 sm:text-sm [&_svg]:size-4 [&_svg]:shrink-0',
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
                    className="absolute -right-0.5 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-4 text-white sm:static sm:min-w-5 sm:text-xs sm:leading-5"
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
