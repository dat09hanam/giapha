'use client';

import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ArticleCard } from '@/components/articles/article-card';
import { foldVietnamese } from '@/lib/person-search';
import type { ArticleSummary } from '@/types/article';

/**
 * The cards of a section with a search box over them. Every published article is already on
 * the page, so typing filters in place: each word must appear in the title or summary, with or
 * without diacritics ("van khan ram" finds "Văn khấn rằm"). The query is kept in `?q=` so a
 * search can be shared or reloaded.
 */
export function ArticleSearchList({
  articles,
  label,
  initialQuery,
}: {
  articles: readonly ArticleSummary[];
  /** The section's name, for the placeholder and messages. */
  label: string;
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);

  const indexed = useMemo(
    () =>
      articles.map((article) => ({
        article,
        text: foldVietnamese(`${article.title} ${article.summary}`),
      })),
    [articles],
  );

  const words = foldVietnamese(query).split(' ').filter(Boolean);
  const shown = words.length
    ? indexed.filter(({ text }) => words.every((word) => text.includes(word))).map((x) => x.article)
    : articles;

  function changeQuery(value: string): void {
    setQuery(value);
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set('q', value.trim());
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url);
  }

  return (
    <div className="grid gap-4 sm:gap-6">
      <search className="mx-auto w-full max-w-2xl">
        <label htmlFor="article-search" className="sr-only">
          Tìm trong {label}
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gold-700"
            aria-hidden="true"
          />
          <input
            id="article-search"
            type="search"
            value={query}
            onChange={(event) => changeQuery(event.currentTarget.value)}
            placeholder="Tìm bài cúng: giỗ, rằm, Tết, nhập trạch…"
            autoComplete="off"
            maxLength={100}
            className="h-13 w-full rounded-full border border-gold-500/50 bg-[var(--card)] pl-12 pr-12 text-base shadow-[0_10px_24px_-20px_rgba(74,46,18,0.6)] outline-none transition placeholder:text-stone-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => changeQuery('')}
              className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-stone-500 hover:bg-gold-50 hover:text-brand-700"
              aria-label="Xoá từ khoá"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <p className="mt-1.5 text-center text-sm text-stone-500" aria-live="polite">
          {words.length
            ? `Tìm thấy ${shown.length} bài phù hợp với “${query.trim()}”`
            : `Có ${articles.length} bài trong mục ${label}`}
        </p>
      </search>

      {shown.length === 0 ? (
        <div className="heritage-panel mx-auto max-w-xl rounded-2xl p-8 text-center">
          <p className="font-display text-lg font-bold text-brand-900">Chưa có bài phù hợp</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Thử từ khoá ngắn hơn, ví dụ “giỗ” hoặc “rằm”.
          </p>
          <button
            type="button"
            onClick={() => changeQuery('')}
            className="mt-4 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Xem tất cả bài
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {shown.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </ul>
      )}
    </div>
  );
}
