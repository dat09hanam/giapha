import { CalendarHeart, Landmark, MapPin, ScrollText } from 'lucide-react';
import type { ReactNode } from 'react';

import { RichTextView } from '@/components/rich-text/rich-text-view';
import { PdfExportButton } from '@/components/ui/pdf-export-button';
import { plainToRichText, richTextIsEmpty } from '@/lib/rich-text';
import type { FamilyDetails } from '@/types/family-tree';

/** Where the home page's links to the introduction land. */
export const FAMILY_ABOUT_ANCHOR = 'gioi-thieu';

function anniversaryOf(family: FamilyDetails): string | null {
  if (family.deathAnniversaryDay === null || family.deathAnniversaryMonth === null) return null;
  const day = String(family.deathAnniversaryDay).padStart(2, '0');
  const month = String(family.deathAnniversaryMonth).padStart(2, '0');
  return `${day}/${month}`;
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="flex min-w-0 items-start gap-3 rounded-xl border border-line/70 bg-paper/70 p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-gold-100 text-brand-700 ring-1 ring-inset ring-gold-500/30 [&_svg]:size-[18px]">
        {icon}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-stone-500">{label}</p>
        <p className="mt-1 break-words font-semibold leading-6 text-stone-900">{value}</p>
      </div>
    </article>
  );
}

/**
 * The family's public facts and the introduction written by the clan head, as a section of
 * its home page.
 */
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
    <section
      id={FAMILY_ABOUT_ANCHOR}
      aria-labelledby="about-introduction-title"
      className="surface grid min-w-0 scroll-mt-4 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.6fr)]"
    >
      <header className="relative isolate overflow-hidden border-b border-line bg-gradient-to-br from-gold-50 to-paper-deep/70 px-5 py-6 sm:px-7 sm:py-8 lg:border-b-0 lg:border-r lg:px-8 lg:py-10">
        <span className="grid size-11 place-items-center rounded-2xl bg-white text-brand-700 shadow-sm ring-1 ring-line [&_svg]:size-5">
          <ScrollText aria-hidden="true" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          Giới thiệu
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
        <div className="mt-4">
          <PdfExportButton
            familySlug={family.slug}
            familyName={family.name}
            filename={`gioi-thieu-${family.slug}`}
            report={{
              title: 'Lịch sử và truyền thống dòng họ',
              scope: 'Thông tin và nội dung giới thiệu dòng họ',
              lines: [
                ...facts.map((fact) => `${fact.label}: ${fact.value}`),
                '',
                ...introduction.blocks.flatMap((block) =>
                  'items' in block
                    ? block.items.map(
                        (item, index) =>
                          `${block.type === 'numbered' ? `${index + 1}.` : '•'} ${item.map((run) => run.text).join('')}`,
                      )
                    : [block.content.map((run) => run.text).join('')],
                ),
              ],
            }}
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-10 -right-8 size-36 rounded-full border border-brand-200/60"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 -right-4 size-24 rounded-full border border-brand-200/50"
        />
      </header>
      <div className="grid min-w-0 content-start gap-5 px-5 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-10">
        {facts.length > 0 ? (
          <div
            aria-label="Thông tin dòng họ"
            role="group"
            className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            {facts.map((fact) => (
              <Fact key={fact.label} {...fact} />
            ))}
          </div>
        ) : null}
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
  );
}
