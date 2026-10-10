import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type FieldProps = ComponentProps<'input'> & {
  label: string;
  icon?: ReactNode;
  trailing?: ReactNode;
};

export function Field({ label, icon, trailing, id, className, ...props }: FieldProps) {
  return (
    <div className="grid gap-1.5" data-field="">
      <label className="text-sm font-medium text-brand-950" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gold-700 [&_svg]:size-4"
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        <input
          id={id}
          className={cn(
            'h-11 w-full rounded-lg border border-gold-700/45 bg-[var(--card)] px-3 text-base outline-none transition placeholder:text-stone-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm',
            icon && 'pl-10',
            trailing && 'pr-11',
            className,
          )}
          {...props}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>
        ) : null}
      </div>
      <span data-field-error="" aria-live="polite" />
    </div>
  );
}
