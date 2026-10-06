import Link from 'next/link';
import type { ReactNode } from 'react';
import { Check, Sprout } from 'lucide-react';

import { CloudMotif } from '@/components/layout/page-hero';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  brandTitle: string;
  brandTagline: string;
  highlights?: string[];
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  brandTitle,
  brandTagline,
  highlights = [],
}: AuthShellProps) {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Link
        href="/"
        className="mb-5 inline-block text-sm font-medium text-brand-900 hover:underline"
      >
        ← Về trang chủ
      </Link>

      <div className="grid overflow-hidden rounded-2xl border border-gold-500/35 shadow-2xl shadow-wood-950/10 lg:grid-cols-[1.05fr_1fr]">
        <aside className="heritage-hero relative isolate flex flex-col justify-between gap-8 overflow-hidden border-0 p-8 text-gold-50 lg:p-10">
          <CloudMotif className="pointer-events-none absolute -right-10 -top-2 -z-10 w-72 text-white/10" />
          <CloudMotif className="pointer-events-none absolute -bottom-3 -left-10 -z-10 w-64 rotate-180 text-white/[0.06]" />
          <div>
            <span className="grid size-11 place-items-center rounded-full border border-gold-300/45 bg-white/10 text-gold-100">
              <Sprout className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-5 font-display text-2xl font-bold lg:text-3xl">{brandTitle}</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-gold-50/75">{brandTagline}</p>
          </div>

          {highlights.length > 0 ? (
            <ul className="hidden gap-3 text-sm text-gold-50/85 lg:grid">
              {highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-50/15">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  <span className="leading-6">{highlight}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </aside>

        <section className="bg-[var(--card)] p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-brand-800">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>

          <div className="mt-7">{children}</div>

          <div className="mt-6 border-t pt-5 text-center text-sm text-stone-600">{footer}</div>
        </section>
      </div>
    </main>
  );
}
