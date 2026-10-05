import { ArrowLeft, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** A hero's main action: white on the red banner, a filled red button on the desktop's paper. */
export const heroButtonClass =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-white/15 px-3.5 text-sm font-medium text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25 disabled:opacity-60 lg:h-10 lg:rounded-xl lg:bg-brand-700 lg:px-4 lg:font-semibold lg:shadow-sm lg:ring-0 lg:hover:bg-brand-800';

/** A round icon button for a hero's actions: white on red, white with red ink on paper. */
export const heroIconButtonClass =
  'grid size-9 place-items-center rounded-full bg-white/15 text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/25 disabled:opacity-60 lg:size-10 lg:bg-white lg:text-brand-800 lg:shadow-sm lg:ring-line lg:hover:bg-brand-50';

/**
 * Pulls the first card up over an `overlap` hero, inset from the screen edge, as in the
 * family sections' phone design. From lg the hero is a plain title, so nothing overlaps.
 */
export const heroOverlapClass = 'relative -mt-10 mx-3 sm:mx-5 lg:mx-0 lg:mt-0';

/** Tường vân: the curling cloud of temple carvings, drawn in the current colour. */
export function CloudMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 54c0-11 9-20 20-20 3-12 14-21 27-21 11 0 21 7 25 17 4-3 9-5 14-5 12 0 22 10 22 22" />
      <path d="M36 54c0-7 5-12 12-12s12 5 12 12c0 4-3 7-7 7s-6-3-6-6" />
      <path d="M84 54c0-5 4-9 9-9s9 4 9 9c0 3-2 5-5 5s-4-2-4-4" />
      <path d="M120 47c4-8 12-13 21-13 6 0 11 2 15 6" />
      <path d="M2 61h58M98 61h60" />
    </svg>
  );
}

/**
 * The top of every family section. On phones and tablets a red banner: a serif title, an
 * optional line under it, actions on the right, and anything else the section shows on red. With
 * `overlap`, it leaves room for the first card to rise over it (`heroOverlapClass`). From lg,
 * beside the red sidebar, it is a red title with its icon on the page's paper instead.
 */
export function PageHero({
  title,
  icon: Icon,
  description,
  back,
  actions,
  overlap = false,
  children,
}: {
  title: ReactNode;
  /** Shown beside the title from lg, as in the sidebar. */
  icon?: LucideIcon;
  description?: ReactNode;
  /** A link back to the section this page belongs to. */
  back?: { href: string; label: string };
  actions?: ReactNode;
  overlap?: boolean;
  children?: ReactNode;
}) {
  return (
    <header
      className={cn(
        'relative isolate overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-5 pt-5 text-white shadow-sm sm:rounded-2xl sm:px-6',
        overlap ? 'pb-14' : 'pb-6',
        'lg:overflow-visible lg:rounded-none lg:bg-none lg:px-0 lg:pb-1 lg:pt-2 lg:text-brand-800 lg:shadow-none',
      )}
    >
      <CloudMotif className="pointer-events-none absolute -right-8 -top-3 -z-10 w-64 text-white/10 lg:hidden" />
      <CloudMotif className="pointer-events-none absolute -bottom-2 -left-10 -z-10 w-56 rotate-180 text-white/[0.06] lg:hidden" />
      {back ? (
        <Link
          href={back.href}
          className="mb-2 inline-flex items-center gap-1 text-sm text-brand-50/80 transition hover:text-white lg:text-brand-700 lg:hover:text-brand-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <h1 className="flex min-w-0 items-center gap-2.5 break-words font-display text-[1.75rem] font-bold leading-tight sm:text-3xl">
          {Icon ? (
            <Icon className="hidden size-7 shrink-0 text-brand-700 lg:block" aria-hidden="true" />
          ) : null}
          <span className="min-w-0">{title}</span>
        </h1>
        {actions ? <div className="flex shrink-0 items-center gap-2 pt-0.5">{actions}</div> : null}
      </div>
      {description ? (
        <div className="mt-1.5 max-w-lg text-sm leading-6 text-brand-50/85 lg:max-w-2xl lg:text-stone-600">
          {description}
        </div>
      ) : null}
      {children}
    </header>
  );
}
