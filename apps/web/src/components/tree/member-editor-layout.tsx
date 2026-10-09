'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type EditorTab<T extends string> = {
  value: T;
  label: string;
  icon: ReactNode;
  /** A count after the label, e.g. how many relatives; hidden when zero. */
  count?: number;
};

/** The member editor's tab row: underlined, every tab one equal column. */
export function EditorTabs<T extends string>({
  tabs,
  value,
  onChange,
  panelId,
}: {
  tabs: readonly EditorTab<T>[];
  value: T;
  onChange: (value: T) => void;
  panelId: string;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (offset === 0) return;
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.value === value);
    onChange(tabs[(index + offset + tabs.length) % tabs.length].value);
  }

  return (
    <div
      role="tablist"
      aria-label="Thông tin thành viên"
      onKeyDown={onKeyDown}
      className="grid auto-cols-fr grid-flow-col border-b border-gold-500/30"
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cn(
              '-mb-px flex h-11 min-w-0 items-center justify-center gap-1.5 border-b-2 px-2 text-sm font-semibold transition',
              selected
                ? 'border-brand-700 text-brand-800'
                : 'border-transparent text-stone-500 hover:text-wood-800',
            )}
          >
            {tab.icon}
            <span className="truncate">{tab.label}</span>
            {tab.count ? (
              <span className="rounded-full bg-gold-100 px-1.5 text-xs tabular-nums text-wood-700">
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * One numbered card of the member editor ("1 · Ảnh & vai vế"). Collapsible
 * cards fold away with the chevron in their header.
 */
export function EditorSection({
  number,
  title,
  badge,
  collapsible = false,
  children,
}: {
  number?: number;
  title: string;
  /** Something small on the right of the header, e.g. a count or a hint. */
  badge?: ReactNode;
  collapsible?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  const heading = (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="h-4 w-1 shrink-0 rounded-full bg-brand-700" aria-hidden="true" />
      <span className="truncate font-semibold text-brand-800">
        {number === undefined ? title : `${number} · ${title}`}
      </span>
    </span>
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-gold-500/25 bg-white/80 shadow-sm">
      <h3 className="border-b border-gold-500/20">
        {collapsible ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen(!open)}
            className="flex h-12 w-full items-center justify-between gap-3 px-4 text-left"
          >
            {heading}
            <span className="flex shrink-0 items-center gap-2">
              {badge}
              <ChevronDown
                className={cn('size-4 text-stone-500 transition', open && 'rotate-180')}
                aria-hidden="true"
              />
            </span>
          </button>
        ) : (
          <span className="flex h-12 items-center justify-between gap-3 px-4">
            {heading}
            {badge}
          </span>
        )}
      </h3>
      <div id={bodyId} hidden={!open} className="grid min-w-0 gap-4 p-4">
        {children}
      </div>
    </section>
  );
}

/** A short grey line under a field. */
export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="-mt-2.5 text-xs leading-5 text-stone-500">{children}</p>;
}
