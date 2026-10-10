import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

import { LogoMark } from '@/components/layout/logo-mark';
import { SITE_BRAND } from '@/lib/site-brand';
import { cn } from '@/lib/utils';

const LANDSCAPE_SRC = '/images/decorations/family-background.png';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  fullScreen?: boolean;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  fullScreen = false,
}: AuthShellProps) {
  return (
    <main
      className={cn(
        'relative isolate flex w-full flex-col overflow-hidden bg-[#f7efdf] lg:items-center lg:justify-center lg:px-12 lg:py-12',
        fullScreen ? 'min-h-dvh' : 'min-h-[calc(100dvh-4rem)]',
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 hidden lg:block"
        aria-hidden="true"
      >
        <Landscape imageClassName="object-bottom" />
      </div>

      <BrandBlock className="px-6 pt-8 lg:hidden" />

      <div className="pointer-events-none relative mt-6 h-64 sm:h-80 lg:hidden" aria-hidden="true">
        <Landscape imageClassName="origin-bottom-right scale-150 object-[100%_100%]" />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f7efdf] to-transparent" />
      </div>

      <section className="relative z-10 mx-4 -mt-16 mb-8 rounded-2xl border border-gold-500/40 bg-[#fffaf0]/95 p-6 shadow-2xl shadow-wood-950/15 backdrop-blur-sm sm:mx-auto sm:w-full sm:max-w-md sm:p-8 lg:m-0 lg:max-w-[26rem] lg:p-9">
        <div className="hidden lg:block">
          <BrandBlock />
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

function BrandBlock({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      <Link
        href="/"
        aria-label={`${SITE_BRAND.name} — Trang chủ`}
        className="grid size-16 place-items-center rounded-full border-2 border-wood-700 bg-[#fffaf0] ring-4 ring-gold-200/70 transition hover:ring-gold-300 focus-visible:outline-none focus-visible:ring-[var(--ring)]"
      >
        <LogoMark className="size-14" />
      </Link>
      <p className="mt-3 font-display text-3xl font-bold text-wood-800">
        {SITE_BRAND.nameLead} <span className="text-brand-700">{SITE_BRAND.nameAccent}</span>
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">
        {SITE_BRAND.tagline}
      </p>
      <p className="mt-2 max-w-[20rem] text-sm leading-6 text-stone-600">
        {SITE_BRAND.description}
      </p>
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
