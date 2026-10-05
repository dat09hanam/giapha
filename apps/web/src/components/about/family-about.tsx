import { CalendarHeart, Info, Landmark, MapPin, ScrollText } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';

import { PageHero, heroOverlapClass } from '@/components/layout/page-hero';
import { RichTextView } from '@/components/rich-text/rich-text-view';
import { plainToRichText, richTextIsEmpty } from '@/lib/rich-text';
import { cn } from '@/lib/utils';
import type { FamilyDetails } from '@/types/family-tree';

/** "Gia phả Họ Nguyễn" → "Họ Nguyễn", so the cover does not say "Gia phả" twice. */
function clanName(name: string): string {
  const rest = name.replace(/^gia\s+phả\s+/i, '').trim();
  return rest || name;
}

function anniversaryOf(family: FamilyDetails): string | null {
  if (family.deathAnniversaryDay === null || family.deathAnniversaryMonth === null) return null;
  const day = String(family.deathAnniversaryDay).padStart(2, '0');
  const month = String(family.deathAnniversaryMonth).padStart(2, '0');
  return `${day}/${month}`;
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="surface flex min-h-24 items-start gap-3.5 p-4 sm:p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 [&_svg]:size-[18px]">
        {icon}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-stone-500">{label}</p>
        <p className="mt-1 break-words font-semibold leading-6 text-stone-900">{value}</p>
      </div>
    </article>
  );
}

/** A family cover, its public facts, and the introduction written by the clan head. */
export function FamilyAbout({ family }: { family: FamilyDetails }) {
  const introduction = family.introduction ?? plainToRichText(family.description);
  const anniversary = anniversaryOf(family);
  const facts = [
    family.ancestryOrigin
      ? {
          icon: <Landmark aria-hidden="true" />,
          label: 'Quê quán / nguồn gốc',
          value: family.ancestryOrigin,
        }
      : null,
    family.address
      ? { icon: <MapPin aria-hidden="true" />, label: 'Địa chỉ hiện nay', value: family.address }
      : null,
    anniversary
      ? { icon: <CalendarHeart aria-hidden="true" />, label: 'Ngày giỗ họ', value: anniversary }
      : null,
  ].filter((fact) => fact !== null);

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-5xl grid-cols-1 gap-4 pb-8 sm:gap-5 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
      <PageHero
        title="Giới thiệu"
        icon={Info}
        description="Cùng tìm hiểu cội nguồn và những giá trị được gìn giữ qua nhiều thế hệ."
        overlap
      />

      <section
        aria-label={`Gia phả ${clanName(family.name)}`}
        className={cn(
          'surface relative isolate min-w-0 min-h-[21rem] overflow-hidden bg-[#f8f1e4] sm:min-h-[24rem] lg:aspect-[16/9] lg:min-h-0',
          heroOverlapClass,
        )}
      >
        <Image
          src="/images/about/family-about-hero.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1280px) 960px, (min-width: 640px) calc(100vw - 64px), calc(100vw - 24px)"
          className="object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-[#fffaf0]/40"
        />
        <div className="relative z-10 flex min-h-[21rem] min-w-0 flex-col items-center justify-center px-4 py-10 text-center sm:min-h-[24rem] sm:px-10 lg:min-h-0">
          <p className="max-w-full rounded-full border border-brand-200/80 bg-white/75 px-3 py-1.5 text-[9px] font-semibold uppercase leading-5 tracking-[0.14em] text-brand-800 shadow-sm backdrop-blur-sm sm:px-4 sm:text-xs sm:tracking-[0.22em]">
            Cội nguồn · Nếp nhà · Tiếp nối
          </p>
          <p className="mt-5 font-display text-xl font-semibold text-brand-700 sm:mt-6 sm:text-2xl">
            Gia phả
          </p>
          <h2 className="mt-1 w-full max-w-full break-words px-1 font-display text-[clamp(2rem,8vw,3rem)] font-bold leading-tight text-brand-800 drop-shadow-sm sm:text-5xl lg:text-6xl">
            {clanName(family.name)}
          </h2>
          <span className="mt-4 h-px w-16 bg-brand-400/70" aria-hidden="true" />
          <p className="mt-3 max-w-md text-sm leading-6 text-stone-700 sm:text-base sm:leading-7">
            Lưu giữ cội nguồn – Kết nối con cháu
            <br className="hidden sm:block" />
            Giữ gìn truyền thống tốt đẹp của dòng họ qua các thế hệ.
          </p>
        </div>
      </section>

      {facts.length > 0 ? (
        <section
          aria-label="Thông tin dòng họ"
          className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {facts.map((fact) => (
            <Fact key={fact.label} {...fact} />
          ))}
        </section>
      ) : null}

      <section
        aria-labelledby="about-introduction-title"
        className="surface grid min-w-0 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.6fr)]"
      >
        <header className="relative isolate overflow-hidden border-b border-line bg-gradient-to-br from-[#fffaf0] to-paper-deep/70 px-5 py-6 sm:px-7 sm:py-8 lg:border-b-0 lg:border-r lg:px-8 lg:py-10">
          <span className="grid size-11 place-items-center rounded-2xl bg-white text-brand-700 shadow-sm ring-1 ring-line [&_svg]:size-5">
            <ScrollText aria-hidden="true" />
          </span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            Lời giới thiệu
          </p>
          <h2
            id="about-introduction-title"
            className="mt-2 font-display text-2xl font-bold leading-snug text-brand-900 sm:text-3xl"
          >
            Lịch sử và truyền thống
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-stone-600">
            Những câu chuyện của dòng họ được lưu lại để các thế hệ cùng tìm hiểu và tiếp nối.
          </p>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-10 -right-8 size-36 rounded-full border border-brand-200/60"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-6 -right-4 size-24 rounded-full border border-brand-200/50"
          />
        </header>
        <div className="min-w-0 px-5 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-10">
          {richTextIsEmpty(introduction) ? (
            <div className="grid min-h-40 content-center justify-items-center rounded-2xl border border-dashed border-line bg-paper/50 px-5 py-8 text-center">
              <ScrollText className="size-6 text-brand-300" aria-hidden="true" />
              <p className="mt-3 font-semibold text-stone-700">
                Câu chuyện dòng họ đang chờ được ghi lại
              </p>
              <p className="mt-1 text-sm text-stone-500">
                Trưởng họ chưa viết phần giới thiệu dòng họ.
              </p>
            </div>
          ) : (
            <RichTextView
              document={introduction}
              className="gap-4 text-[15px] leading-7 sm:text-base sm:leading-8"
            />
          )}
        </div>
      </section>
    </div>
  );
}
