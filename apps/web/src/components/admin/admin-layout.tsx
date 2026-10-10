import type { ReactNode } from 'react';

import { CloudMotif } from '@/components/layout/page-hero';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
    <header className="heritage-hero relative isolate flex min-w-0 flex-col gap-4 overflow-hidden rounded-2xl px-5 py-6 text-white sm:flex-row sm:items-end sm:justify-between sm:gap-5 sm:px-8 sm:py-8">
      <CloudMotif className="pointer-events-none absolute -right-8 -top-3 -z-10 w-72 text-white/10" />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-medium text-gold-100/90 [&_svg]:size-4">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-balance font-display text-2xl font-bold sm:truncate sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-pretty text-sm leading-6 text-gold-50/80 sm:text-base sm:leading-7">
          {description}
        </p>
      </div>
      {actions ? (
        <div className="grid auto-cols-fr grid-flow-col gap-2 sm:flex sm:shrink-0 sm:flex-wrap sm:gap-3">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

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
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('heritage-panel', className)}>
      <div className="flex flex-col gap-4 border-b border-line px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:py-5">
        <div className="flex min-w-0 gap-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-gold-100 text-brand-700 ring-1 ring-inset ring-gold-500/30 [&_svg]:size-5">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-7 text-stone-900">{title}</h2>
            {description ? (
              <p className="mt-0.5 max-w-2xl text-sm leading-6 text-stone-600">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="px-4 py-5 sm:px-7 sm:py-6">{children}</div>
      {footer ? (
        <div className="flex flex-col-reverse gap-3 rounded-b-2xl border-t border-line bg-paper/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}
