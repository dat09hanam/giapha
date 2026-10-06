import type { ComponentProps } from 'react';

type FieldProps = ComponentProps<'input'> & {
  label: string;
  hint?: string;
};

export function Field({ label, hint, id, ...props }: FieldProps) {
  return (
    <label className="grid gap-1.5" htmlFor={id}>
      <span className="text-sm font-medium text-brand-950">{label}</span>
      <input
        id={id}
        className="h-11 rounded-lg border border-gold-700/45 bg-[var(--card)] px-3 text-base outline-none transition placeholder:text-stone-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm"
        {...props}
      />
      {hint ? <span className="text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}
