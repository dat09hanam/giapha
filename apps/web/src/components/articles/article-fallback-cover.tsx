import { LogoMark } from '@/components/layout/logo-mark';
import { SITE_BRAND } from '@/lib/site-brand';
import { cn } from '@/lib/utils';

const BACKGROUND_SRC = '/images/decorations/article-cover-background.webp';
const LOTUS_SRC = '/images/home/footer-lotus.webp';

/**
 * Branded stand-in for articles without an uploaded cover: the site landscape with
 * the logo, site name and the article title. Sizes use container units so the same
 * markup works from a card thumbnail up to the full-width article header; on very
 * narrow thumbnails only the logo is shown because the card already prints the title.
 */
export function ArticleFallbackCover({ title, className }: { title: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        '@container relative overflow-hidden bg-paper-deep bg-cover bg-position-[center_70%]',
        className,
      )}
      style={{ backgroundImage: `url(${BACKGROUND_SRC})` }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgb(252_246_232/0.88),rgb(252_246_232/0)_75%)]" />
      <div className="relative flex h-full flex-col items-center justify-center gap-[3cqw] px-[8cqw] text-center">
        <div className="flex items-center gap-[2cqw]">
          <LogoMark className="size-[42cqw] border border-gold-500/60 bg-white shadow-sm @3xs:size-[10cqw]" />
          <div className="hidden text-left @3xs:block">
            <p className="font-display text-[4.2cqw] font-bold leading-tight text-[#1f4a3a]">
              {SITE_BRAND.nameLead} <span className="text-brand-700">{SITE_BRAND.nameAccent}</span>
            </p>
            <p className="mt-[0.4cqw] hidden text-[1.8cqw] @lg:block font-medium uppercase tracking-[0.3em] text-wood-500">
              {SITE_BRAND.tagline}
            </p>
          </div>
        </div>
        <div className="hidden @3xs:block">
          <p className="line-clamp-3 font-display text-[6.4cqw] font-bold leading-[1.15] text-[#1f4a3a] [text-shadow:0_2px_12px_rgb(255_248_230/0.95)]">
            {title}
          </p>
        </div>
        <div className="hidden items-center gap-[2cqw] @3xs:flex">
          <span className="h-px w-[14cqw] bg-linear-to-r from-transparent to-gold-600" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOTUS_SRC} alt="" className="w-[4cqw]" />
          <span className="h-px w-[14cqw] bg-linear-to-l from-transparent to-gold-600" />
        </div>
      </div>
    </div>
  );
}
