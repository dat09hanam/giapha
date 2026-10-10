'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  asTabs = false,
  className,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  asTabs?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-gold-500/25 bg-paper-deep/75 p-1',
        className,
      )}
      role={asTabs ? 'tablist' : 'group'}
      aria-label={label}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role={asTabs ? 'tab' : undefined}
            aria-selected={asTabs ? selected : undefined}
            aria-pressed={asTabs ? undefined : selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition',
              selected
                ? 'bg-brand-700 text-white shadow-sm'
                : 'text-stone-600 hover:bg-gold-50 hover:text-wood-800',
            )}
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
            {option.count !== undefined ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  selected ? 'bg-white/20 text-white' : 'bg-gold-100 text-wood-600',
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
