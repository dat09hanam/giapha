import Link from 'next/link';
import { ArrowLeft, CalendarDays } from 'lucide-react';

import { PageLoader } from '@/components/ui/heritage-loader';
import { ArticleCard, SectionIcon, formatDate } from '@/components/articles/article-card';
import { ArticleSearchList } from '@/components/articles/article-search-list';
import { RichTextView } from '@/components/rich-text/rich-text-view';
import { ARTICLE_SECTIONS, articleCoverSrc } from '@/lib/article-api';
import type { Article, ArticleCategory, ArticleSummary } from '@/types/article';

/** The heading band at the top of a section. */
function SectionHero({ category }: { category: ArticleCategory }) {
  const section = ARTICLE_SECTIONS[category];
  return (
    <header className="border-b border-gold-500/25 bg-gradient-to-b from-gold-50 to-transparent">
      <div className="mx-auto max-w-6xl px-4 pb-5 pt-4 text-center sm:px-6 sm:pb-7 sm:pt-6">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-wood-700">
          <SectionIcon category={category} className="size-4" />
          {section.label}
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-bold text-brand-900 sm:text-4xl">
          {section.heading}
        </h1>
        <p className="mx-auto mt-1.5 max-w-2xl text-sm leading-6 text-stone-600 sm:text-[15px] sm:leading-7">
          {section.description}
        </p>
      </div>
    </header>
  );
}

export function ArticleListView({
  category,
  articles,
  searchable = false,
  initialQuery = '',
}: {
  category: ArticleCategory;
  articles: readonly ArticleSummary[];
  /** Shows a search box over the cards. */
  searchable?: boolean;
  /** The `?q=` the page was opened with. */
  initialQuery?: string;
}) {
  return (
    <main className="pb-16">
      <SectionHero category={category} />
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
        {articles.length === 0 ? (
          <section className="heritage-panel mx-auto max-w-xl rounded-2xl p-8 text-center">
            <SectionIcon category={category} className="mx-auto size-8 text-gold-700" />
            <h2 className="mt-4 font-display text-xl font-bold text-brand-900">
              Bài viết đang được biên soạn
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Mục {ARTICLE_SECTIONS[category].label} chưa có bài nào. Mời bạn quay lại sau.
            </p>
          </section>
        ) : searchable ? (
          <ArticleSearchList
            articles={articles}
            label={ARTICLE_SECTIONS[category].label}
            initialQuery={initialQuery}
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

export function ArticleView({
  article,
  related,
}: {
  article: Article;
  /** Other articles of the same section, newest first. */
  related: readonly ArticleSummary[];
}) {
  const section = ARTICLE_SECTIONS[article.category];
  const date = formatDate(article.publishedAt);
  const cover = articleCoverSrc(article.coverUrl);
  return (
    <main className="pb-16">
      <article className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12">
        <Link
          href={section.path}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-wood-700 hover:text-brand-700"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {section.label}
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-brand-900 sm:text-4xl">
          {article.title}
        </h1>
        {date ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-stone-500">
            <CalendarDays className="size-4" aria-hidden="true" />
            {date}
          </p>
        ) : null}
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="mt-6 aspect-[16/9] w-full rounded-2xl border border-gold-500/30 object-cover"
          />
        ) : null}
        <RichTextView document={article.content} className="mt-8 text-base leading-8" />
      </article>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {related.length > 0 ? (
          <section className="mt-14" aria-labelledby="related-title">
            <h2 id="related-title" className="font-display text-2xl font-bold text-brand-900">
              Bài viết khác
            </h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {related.map((item) => (
                <ArticleCard key={item.id} article={item} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export function ArticlesLoading() {
  return <PageLoader label="Đang tải bài viết" />;
}

/** An unknown path or an article taken down, inside the section's masthead. */
export function ArticleNotFound({ category }: { category: ArticleCategory }) {
  const section = ARTICLE_SECTIONS[category];
  return (
    <main className="mx-auto grid min-h-[60vh] w-full max-w-xl place-items-center px-4 py-12">
      <section className="heritage-panel w-full rounded-2xl p-8 text-center">
        <SectionIcon category={category} className="mx-auto size-8 text-gold-700" />
        <h1 className="mt-4 font-display text-2xl font-bold text-brand-900">
          Không tìm thấy bài viết
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Đường dẫn có thể chưa đúng, hoặc bài viết đã được gỡ xuống.
        </p>
        <Link
          href={section.path}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-brand-700 px-5 text-sm font-semibold text-white transition hover:bg-brand-800"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Xem các bài {section.label}
        </Link>
      </section>
    </main>
  );
}
