import type { ComponentProps } from 'react';

type FieldProps = ComponentProps<'input'> & {
  label: string;
  hint?: string;
};

export function Field({ label, hint, id, ...props }: FieldProps) {
  return (
    <label className="grid gap-1.5" htmlFor={id}>
      <span className="text-sm font-medium text-emerald-950">{label}</span>
      <input
        id={id}
        className="h-11 rounded-xl border bg-white px-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
        {...props}
      />
      {hint ? <span className="text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  ) : null;
}
