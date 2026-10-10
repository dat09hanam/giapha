import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarDays, Flame } from 'lucide-react';

import { articleCoverSrc, articleHref } from '@/lib/article-api';
import type { ArticleCategory, ArticleSummary } from '@/types/article';

const DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});

export function formatDate(iso: string | null): string | null {
  return iso ? DATE_FORMAT.format(new Date(iso)) : null;
}

export function SectionIcon({
  category,
  className,
}: {
  category: ArticleCategory;
  className?: string;
}) {
  const Icon = category === 'PRAYER' ? Flame : BookOpen;
  return <Icon className={className} aria-hidden="true" />;
}

function Cover({ article, className }: { article: ArticleSummary; className: string }) {
  const src = articleCoverSrc(article.coverUrl);
  if (!src) {
    return (
      <div
        className={`${className} grid place-items-center bg-gradient-to-br from-gold-100 to-paper-deep text-gold-700`}
      >
        <SectionIcon category={article.category} className="size-6 opacity-70 sm:size-10" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`${className} object-cover`} loading="lazy" />
  );
}

export function ArticleCard({ article }: { article: ArticleSummary }) {
  const date = formatDate(article.publishedAt);
  return (
    <li>
      <Link
        href={articleHref(article.category, article.slug)}
        className="group flex h-full overflow-hidden rounded-2xl sm:flex-col border border-gold-500/30 bg-[var(--card)] shadow-[0_14px_30px_-26px_rgba(74,46,18,0.6)] transition hover:-translate-y-0.5 hover:border-gold-500/70 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <Cover
          article={article}
          className="aspect-[4/3] w-28 shrink-0 sm:aspect-[16/9] sm:w-full"
        />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-3 py-2.5 sm:justify-start sm:p-5">
          {date ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-stone-500 max-sm:hidden">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {date}
            </span>
          ) : null}
          <h2 className="font-display text-base font-bold leading-snug text-brand-900 group-hover:text-brand-700 max-sm:line-clamp-3 sm:text-lg">
            {article.title}
          </h2>
          <p className="line-clamp-3 text-sm leading-6 text-stone-600 max-sm:hidden">
            {article.summary}
          </p>
          <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-brand-700 max-sm:hidden">
            Đọc tiếp
            <ArrowRight
              className="size-4 transition group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </Link>
    </li>
  );
}
