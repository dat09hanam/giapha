import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Shared copy for every failure that is the platform's fault, never the visitor's. */
export const MAINTENANCE_COPY = {
  title: 'Hệ thống đang bảo trì',
  message:
    'Chúng tôi đang nâng cấp và bảo trì để phục vụ dòng họ tốt hơn. Vui lòng quay lại sau ít phút.',
  hint: 'Dữ liệu gia phả của bạn vẫn được lưu giữ an toàn.',
} as const;

type ErrorStateProps = {
  /** `system` is the platform's fault (maintenance); `notice` is something the visitor can fix. */
  tone: 'system' | 'notice';
  icon: LucideIcon;
  /** What the page was trying to do, shown small above the heading. */
  context?: string;
  title: string;
  message: string;
  /** Extra reassurance under the message. */
  hint?: string;
  actions: ReactNode;
};

const TONE_STYLES = {
  system: {
    halo: 'bg-gold-100/80',
    badge: 'border-gold-700/30 bg-gold-50 text-gold-700',
  },
  notice: {
    halo: 'bg-brand-100/60',
    badge: 'border-brand-700/20 bg-brand-50 text-brand-700',
  },
} as const;

export function ErrorState({
  tone,
  icon: Icon,
  context,
  title,
  message,
  hint,
  actions,
}: ErrorStateProps) {
  const styles = TONE_STYLES[tone];

  return (
    <main className="mx-auto grid min-h-[70vh] w-full max-w-2xl place-items-center px-4 py-12">
      <section
        className="heritage-panel w-full rounded-2xl px-6 py-10 text-center sm:px-12"
        role={tone === 'system' ? 'status' : 'alert'}
        aria-live="polite"
      >
        <span className="relative mx-auto grid size-20 place-items-center">
          <span
            className={cn('absolute inset-0 rounded-full motion-safe:animate-pulse', styles.halo)}
            aria-hidden="true"
          />
          <span
            className={cn(
              'relative grid size-14 place-items-center rounded-full border shadow-sm',
              styles.badge,
            )}
          >
            <Icon className="size-7" aria-hidden="true" />
          </span>
        </span>
        {context ? (
          <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-wood-700/70 uppercase">
            {context}
          </p>
        ) : null}
        <h1
          className={cn(
            'font-display text-2xl font-bold text-brand-800',
            context ? 'mt-1' : 'mt-5',
          )}
        >
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-stone-600">{message}</p>
        {hint ? (
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">{hint}</p>
        ) : null}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{actions}</div>
      </section>
    </main>
  );
}
