import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** The title strip at the top of an admin page: what it is, whose it is, and quick links. */
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: ReactNode;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-800 [&_svg]:size-4">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-emerald-950 sm:truncate sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-pretty text-sm leading-6 text-stone-600 sm:text-base sm:leading-7">
          {description}
        </p>
      </div>
      {/* Phones: the actions share one row in equal columns. */}
      {actions ? (
        <div className="grid auto-cols-fr grid-flow-col gap-2 sm:flex sm:shrink-0 sm:flex-wrap sm:gap-3">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

/**
 * One admin section: a header with a small icon, title and short description,
 * then its content, and an optional action bar along the bottom.
 */
export function SectionCard({
  icon,
  title,
  description,
  actions,
  footer,
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  /** Buttons beside the title, such as "add". */
  actions?: ReactNode;
  /** The bar along the bottom, such as save and reset. */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('bg-white/85 shadow-sm', className)}>
      <div className="flex flex-col gap-4 border-b border-emerald-950/10 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:py-5">
        <div className="flex min-w-0 gap-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-900 [&_svg]:size-5">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-7 text-emerald-950">{title}</h2>
            {description ? (
              <p className="mt-0.5 max-w-2xl text-sm leading-6 text-stone-600">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="px-4 py-5 sm:px-7 sm:py-6">{children}</div>
      {footer ? (
        <div className="flex flex-col-reverse gap-3 rounded-b-2xl border-t border-emerald-950/10 bg-stone-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}
