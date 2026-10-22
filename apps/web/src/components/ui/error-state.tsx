import { ShieldCheck, type LucideIcon } from 'lucide-react';
import Image from 'next/image';
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

const BACKGROUND_SRC = '/images/decorations/article-cover-background.webp';

const TONE_STYLES = {
  system: {
    medallion: 'from-gold-300 via-gold-500 to-gold-700 text-[#fffaf0]',
    halo: 'bg-gold-300/40',
  },
  notice: {
    medallion: 'from-brand-400 via-brand-600 to-brand-800 text-[#fffaf0]',
    halo: 'bg-brand-300/30',
  },
} as const;

const CORNERS = [
  'left-3 top-3',
  'right-3 top-3 rotate-90',
  'bottom-3 right-3 rotate-180',
  'bottom-3 left-3 -rotate-90',
] as const;

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
    <main className="relative isolate grid min-h-[calc(100dvh-4rem)] w-full place-items-center overflow-hidden px-4 pb-24 pt-20 sm:pb-32">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <Image
          src={BACKGROUND_SRC}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-bottom"
        />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#fdfbf7] to-transparent" />
        <div className="absolute left-1/2 top-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fffaf0]/70 blur-3xl" />
      </div>

      <section
        className="relative w-full max-w-xl rounded-2xl border border-gold-500/40 bg-[#fffaf0]/90 px-6 pb-9 pt-16 text-center shadow-2xl shadow-wood-950/15 backdrop-blur-sm sm:px-12"
        role={tone === 'system' ? 'status' : 'alert'}
        aria-live="polite"
      >
        <div
          className="pointer-events-none absolute inset-2 rounded-xl border border-gold-500/25"
          aria-hidden="true"
        />
        {CORNERS.map((position) => (
          <CornerOrnament key={position} className={position} />
        ))}

        <span
          className="absolute left-1/2 top-0 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center"
          aria-hidden="true"
        >
          <span
            className={cn('absolute inset-0 rounded-full motion-safe:animate-pulse', styles.halo)}
          />
          <span
            className={cn(
              'relative grid size-[4.5rem] place-items-center rounded-full bg-gradient-to-br shadow-lg shadow-wood-950/20 ring-4 ring-[#fffaf0]',
              styles.medallion,
            )}
          >
            <span className="absolute inset-1.5 rounded-full border border-[#fffaf0]/50" />
            <Icon className="size-8" strokeWidth={1.75} />
          </span>
        </span>

        {context ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">
            {context}
          </p>
        ) : null}
        <h1 className="mt-2 font-display text-3xl font-bold text-brand-800">{title}</h1>
        <LotusDivider className="mx-auto mt-4 max-w-56" />
        <p className="mx-auto mt-4 max-w-md leading-7 text-stone-700">{message}</p>
        {hint ? (
          <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-50 px-4 py-1.5 text-sm text-wood-700">
            <ShieldCheck className="size-4 text-gold-700" aria-hidden="true" />
            {hint}
          </p>
        ) : null}
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          {actions}
        </div>
      </section>
    </main>
  );
}

function CornerOrnament({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn('pointer-events-none absolute size-9 text-gold-600/70', className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 37V14C3 7.9 7.9 3 14 3h23" strokeWidth="1.5" />
      <path d="M9 37V18c0-5 4-9 9-9h19" strokeWidth="1" opacity="0.5" />
      <path d="M14 14c0-2.5 2-4 4-3.4 1.6.5 2 2.6.6 3.6-1 .7-2.4.1-2.3-1" strokeWidth="1.2" />
      <circle cx="3" cy="37" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="37" cy="3" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LotusDivider({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 text-gold-500', className)} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-500/60" />
      <svg viewBox="0 0 24 12" className="h-3 w-6" fill="currentColor">
        <path d="M12 0c1.6 2 2.4 4.2 2.4 6.4S13.6 10.4 12 12c-1.6-1.6-2.4-3.4-2.4-5.6S10.4 2 12 0Z" />
        <path d="M0 9c3.2-1.6 6.4-1.4 9.2.6.9.7 1.8 1.5 2.8 2.4-3.6.4-6.6.2-9-.6C1.8 11 .8 10.2 0 9Zm24 0c-3.2-1.6-6.4-1.4-9.2.6-.9.7-1.8 1.5-2.8 2.4 3.6.4 6.6.2 9-.6 1.2-.4 2.2-1.2 3-2.4Z" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-500/60" />
    </div>
  );
}
