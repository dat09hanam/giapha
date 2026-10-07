import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, Sprout } from 'lucide-react';

import { cn } from '@/lib/utils';

const LANDSCAPE_SRC = '/images/decorations/family-background.png';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  brandTitle: string;
  brandTagline: string;
  /** True when the page draws no site header, so the shell fills the whole viewport. */
  fullScreen?: boolean;
};

/**
 * Ink-wash landscape behind a parchment card. On large screens the card floats centred over the
 * full scene; on phones the brand sits above a landscape band and the card overlaps its lower edge.
 */
export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  brandTitle,
  brandTagline,
  fullScreen = false,
}: AuthShellProps) {
  return (
    <main
      className={cn(
        'relative isolate flex w-full flex-col overflow-hidden bg-[#f7efdf] lg:items-center lg:justify-center lg:px-12 lg:py-12',
        fullScreen ? 'min-h-dvh' : 'min-h-[calc(100dvh-4rem)]',
      )}
    >
      {/* Large screens: the landscape fills the page behind the card. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 hidden lg:block"
        aria-hidden="true"
      >
        <Landscape imageClassName="object-bottom" />
      </div>

      <BrandBlock title={brandTitle} tagline={brandTagline} className="px-6 pt-8 lg:hidden" />

      {/* Phones and tablets: a landscape band the card overlaps. */}
      <div className="pointer-events-none relative mt-6 h-64 sm:h-80 lg:hidden" aria-hidden="true">
        <Landscape imageClassName="origin-bottom-right scale-150 object-[100%_100%]" />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f7efdf] to-transparent" />
      </div>

      <section className="relative z-10 mx-4 -mt-16 mb-8 rounded-2xl border border-gold-500/40 bg-[#fffaf0]/95 p-6 shadow-2xl shadow-wood-950/15 backdrop-blur-sm sm:mx-auto sm:w-full sm:max-w-md sm:p-8 lg:m-0 lg:max-w-[26rem] lg:p-9">
        <div className="hidden lg:block">
          <BrandBlock title={brandTitle} tagline={brandTagline} />
          <LotusDivider className="my-6" />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-brand-800">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>

        <div className="mt-6">{children}</div>

        {fullScreen ? (
          <Link
            href="/"
            className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-wood-700 transition hover:bg-gold-100/70 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Quay về trang chủ
          </Link>
        ) : null}

        <LotusDivider className={fullScreen ? 'mt-3' : 'mt-6'} />
        <div className="mt-3 text-center text-xs text-stone-600">{footer}</div>
      </section>
    </main>
  );
}

function Landscape({ imageClassName }: { imageClassName: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Image
        src={LANDSCAPE_SRC}
        alt=""
        fill
        priority
        sizes="100vw"
        className={cn('object-cover', imageClassName)}
      />
    </div>
  );
}

function BrandBlock({
  title,
  tagline,
  className,
}: {
  title: string;
  tagline: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      <Link
        href="/"
        aria-label="Về trang chủ"
        className="grid size-14 place-items-center rounded-full bg-wood-700 text-gold-100 ring-4 ring-gold-200/70 transition hover:bg-wood-800 hover:ring-gold-300 focus-visible:outline-none focus-visible:ring-[var(--ring)]"
      >
        <Sprout className="size-7" aria-hidden="true" />
      </Link>
      <p className="mt-3 font-display text-3xl font-bold text-wood-800">{title}</p>
      <p className="mt-2 max-w-[18rem] text-sm leading-6 text-stone-600">{tagline}</p>
    </div>
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
