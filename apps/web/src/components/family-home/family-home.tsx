import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Images,
  Network,
  Newspaper,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { BlossomBranch } from '@/components/about/about-art';
import { FamilyAbout } from '@/components/about/family-about';
import { familyHref } from '@/lib/family-nav';
import type { FeedPost } from '@/lib/feed-api';
import type { FundLedger } from '@/lib/fund-api';
import { familyMediaSrc } from '@/lib/media-api';
import { formatVnd, vndInWords } from '@/lib/vietnamese-number';
import { cn } from '@/lib/utils';
import type { FamilyDetails, FamilyFeature, FamilyFeatures } from '@/types/family-tree';

/** A home page block: switched off by the platform, failed to load, or its data. */
export type HomeSection<T> = { state: 'off' } | { state: 'error' } | { state: 'ok'; data: T };

export type FamilyHomeData = {
  slug: string;
  family: FamilyDetails;
  /** Null when the switches could not be read: show every section, as the navigation does. */
  features: FamilyFeatures | null;
  fund: HomeSection<FundLedger['totals']>;
  posts: HomeSection<FeedPost[]>;
};

const dayFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** "Họ Nguyễn" → "Gia phả Họ Nguyễn"; a name that already says "Gia phả" is kept. */
function familyTitle(name: string): string {
  return /^gia\s+phả\s/i.test(name) ? name : `Gia phả ${name}`;
}

function isOn(features: FamilyFeatures | null, feature: FamilyFeature): boolean {
  return features?.[feature] ?? true;
}

/** A post has no title, so its first line stands in for one and the rest is the excerpt. */
function postHeadline(content: string): { title: string; excerpt: string } {
  const [first = '', ...rest] = content.trim().split(/\n+/);
  return { title: first || 'Bài viết có hình ảnh', excerpt: rest.join(' ') };
}

function IconBadge({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      className={cn(
        'grid size-12 shrink-0 place-items-center rounded-full bg-gold-100 text-brand-700 ring-1 ring-inset ring-gold-500/30',
        className,
      )}
    >
      <Icon className="size-6" strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

function PanelHeading({
  id,
  icon: Icon,
  title,
  href,
  linkLabel,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-line/70 px-4 py-3">
      <Icon className="size-5 shrink-0 text-brand-700" aria-hidden="true" />
      <h2
        id={id}
        className="min-w-0 flex-1 truncate font-display text-lg font-semibold text-wood-900"
      >
        {title}
      </h2>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-900"
      >
        {linkLabel}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

function PanelMessage({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-stone-500">{children}</p>;
}

/** "Gia phả Họ Nguyễn" → "Họ Nguyễn", so the cover does not say "Gia phả" twice. */
function clanName(name: string): string {
  return name.replace(/^gia\s+phả\s+/i, '').trim() || name;
}

/** The family's cover: the ancestral gate over lotus ponds, with the clan's name. */
function Hero({ family }: { family: FamilyDetails }) {
  return (
    <section
      aria-label={familyTitle(family.name)}
      className="surface relative isolate min-h-[25rem] min-w-0 overflow-hidden bg-paper sm:min-h-[27rem] lg:aspect-[16/9] lg:max-h-[34rem] lg:min-h-0 lg:w-full"
    >
      <Image
        src="/images/decorations/family-about-hero.webp"
        alt=""
        fill
        priority
        sizes="(min-width: 1280px) 1216px, (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)"
        className="object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-paper/45"
      />
      <div className="relative z-10 flex h-full min-h-[25rem] min-w-0 flex-col items-center justify-end px-4 pb-8 pt-10 text-center sm:min-h-[27rem] sm:px-10 sm:pb-10 lg:min-h-0 lg:pb-[4%]">
        <p className="mt-5 font-display text-xl font-semibold text-brand-700 sm:mt-6 sm:text-2xl">
          Gia phả
        </p>
        <h1 className="mt-1 w-full max-w-full break-words px-1 font-display text-[clamp(2rem,8vw,3rem)] font-bold leading-tight text-brand-800 drop-shadow-sm sm:text-5xl lg:text-6xl">
          {clanName(family.name)}
        </h1>
        <span className="mt-4 h-px w-16 bg-brand-400/70" aria-hidden="true" />
        <p className="mt-3 max-w-md text-sm leading-6 text-stone-700 sm:text-base sm:leading-7">
          Lưu giữ cội nguồn – Kết nối con cháu
        </p>
      </div>
    </section>
  );
}

type QuickLink = {
  feature?: FamilyFeature;
  icon: LucideIcon;
  title: string;
  hint: string;
  path: string;
};

const QUICK_LINKS: readonly QuickLink[] = [
  {
    icon: Network,
    title: 'Xem gia phả',
    hint: 'Tra cứu cây gia phả, xem thông tin các thế hệ, tìm kiếm thành viên.',
    path: 'gia-pha',
  },
  {
    feature: 'feed',
    icon: Newspaper,
    title: 'Bảng tin',
    hint: 'Cập nhật các thông báo, tin tức mới nhất của dòng họ.',
    path: 'bang-tin',
  },
  {
    feature: 'fund',
    icon: Wallet,
    title: 'Quỹ họ',
    hint: 'Xem thu - chi, các khoản đóng góp và lịch sử quỹ.',
    path: 'quy-ho',
  },
  {
    feature: 'library',
    icon: Images,
    title: 'Album',
    hint: 'Lưu giữ và xem lại những hình ảnh, tư liệu quý.',
    path: 'tu-lieu',
  },
];

function QuickLinks({ slug, features }: { slug: string; features: FamilyFeatures | null }) {
  const links = QUICK_LINKS.filter((link) => !link.feature || isOn(features, link.feature));
  return (
    <nav aria-label="Lối tắt" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {links.map(({ icon, title, hint, path }) => (
        <Link
          key={path}
          href={familyHref(slug, path)}
          className="surface group flex items-center gap-3 px-4 py-4 transition hover:border-gold-500 hover:shadow-md"
        >
          <IconBadge icon={icon} className="size-14" />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base font-semibold text-wood-900">
              {title}
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">{hint}</span>
          </span>
          <ChevronRight
            className="size-5 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-brand-700"
            aria-hidden="true"
          />
        </Link>
      ))}
    </nav>
  );
}

function LatestPosts({ slug, posts }: { slug: string; posts: HomeSection<FeedPost[]> }) {
  const href = familyHref(slug, 'bang-tin');
  return (
    <section className="surface flex flex-col overflow-hidden" aria-labelledby="home-feed">
      <PanelHeading
        id="home-feed"
        icon={Newspaper}
        title="Bảng tin mới nhất"
        href={href}
        linkLabel="Xem tất cả"
      />
      {posts.state === 'error' ? (
        <PanelMessage>Chưa thể tải bảng tin. Hãy tải lại trang để thử lại.</PanelMessage>
      ) : posts.state === 'ok' && posts.data.length === 0 ? (
        <PanelMessage>Bảng tin chưa có bài viết nào.</PanelMessage>
      ) : posts.state === 'ok' ? (
        <ul className="divide-y divide-line/60">
          {posts.data.slice(0, 3).map((post) => {
            const { title, excerpt } = postHeadline(post.content);
            const cover = post.images[0];
            return (
              <li key={post.id}>
                <Link
                  href={href}
                  className="group flex items-center gap-3 px-4 py-3 hover:bg-gold-50/70"
                >
                  <span className="grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-gold-100 ring-1 ring-inset ring-line">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={familyMediaSrc(slug, cover.url)}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    ) : (
                      <Newspaper className="size-6 text-gold-700" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-wood-900">{title}</span>
                    <span className="block text-xs text-stone-500">
                      {dayFormat.format(new Date(post.createdAt))} · {post.authorName}
                    </span>
                    {excerpt ? (
                      <span className="mt-0.5 line-clamp-1 block text-sm text-stone-600">
                        {excerpt}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight
                    className="size-5 shrink-0 text-stone-400 group-hover:text-brand-700"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

function FundSummary({ slug, fund }: { slug: string; fund: HomeSection<FundLedger['totals']> }) {
  return (
    <section className="surface relative flex flex-col overflow-hidden" aria-labelledby="home-fund">
      <PanelHeading
        id="home-fund"
        icon={Wallet}
        title="Quỹ họ"
        href={familyHref(slug, 'quy-ho')}
        linkLabel="Xem chi tiết"
      />
      {fund.state === 'ok' ? (
        <div className="relative flex flex-1 flex-col px-4 py-4">
          <BlossomBranch className="pointer-events-none absolute -right-2 top-0 w-28 -scale-x-100 opacity-70" />
          <p className="text-sm font-medium text-stone-600">Số dư quỹ họ</p>
          <p className="mt-1 font-display text-3xl font-bold text-brand-700">
            {formatVnd(fund.data.balance)}
          </p>
          <p className="mt-1 text-xs italic text-stone-500">
            Bằng chữ: {vndInWords(fund.data.balance)}
          </p>
          <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <p className="flex items-center gap-1 text-xs font-medium text-emerald-800">
                <ArrowDownLeft className="size-3.5" aria-hidden="true" />
                Tổng thu
              </p>
              <p className="mt-1 truncate font-bold text-emerald-800">
                {formatVnd(fund.data.income)}
              </p>
            </div>
            <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5">
              <p className="flex items-center gap-1 text-xs font-medium text-brand-800">
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
                Tổng chi
              </p>
              <p className="mt-1 truncate font-bold text-brand-700">
                {formatVnd(fund.data.expense)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <PanelMessage>Chưa thể tải quỹ họ. Hãy tải lại trang để thử lại.</PanelMessage>
      )}
    </section>
  );
}

/** A family's home: a welcome, shortcuts, and the latest of its sections at a glance. */
export function FamilyHome({ slug, family, features, fund, posts }: FamilyHomeData) {
  const panels = [
    posts.state !== 'off' ? <LatestPosts key="feed" slug={slug} posts={posts} /> : null,
    fund.state !== 'off' ? <FundSummary key="fund" slug={slug} fund={fund} /> : null,
  ].filter(Boolean);

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:gap-5 lg:px-8 lg:py-6">
      <Hero family={family} />
      <QuickLinks slug={slug} features={features} />
      <div className={cn('grid gap-4 lg:gap-5', panels.length === 2 && 'md:grid-cols-[1.4fr_1fr]')}>
        {panels}
      </div>
      <FamilyAbout family={family} />
    </main>
  );
}
