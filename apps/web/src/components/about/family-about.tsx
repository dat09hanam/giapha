import { CalendarHeart, Info, Landmark, MapPin, ScrollText } from 'lucide-react';
import type { ReactNode } from 'react';

import { BlossomBranch, Lotus, Mountains, TempleGate } from '@/components/about/about-art';
import { CloudMotif, heroOverlapClass, PageHero } from '@/components/layout/page-hero';
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
    <div className="flex items-start gap-3 rounded-xl bg-paper/70 px-3 py-2.5">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white text-brand-700 ring-1 ring-inset ring-line [&_svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-stone-500">{label}</p>
        <p className="break-words text-sm font-semibold text-stone-900">{value}</p>
      </div>
    </div>
  );
}

/**
 * Giới thiệu: an illustrated cover with the clan's name, its key facts, and the introduction
 * the clan head wrote in the admin area.
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
    <div className="mx-auto grid w-full max-w-2xl gap-3 pb-6 sm:gap-4 sm:px-4 sm:py-6 lg:max-w-4xl lg:px-8 lg:py-8">
      <PageHero title="Giới thiệu" icon={Info} overlap />

      <section
        aria-label={`Gia phả ${clanName(family.name)}`}
        className={cn(
          'surface relative isolate overflow-hidden bg-gradient-to-b from-[#fffaf0] to-paper px-5 pb-24 pt-6 text-center',
          heroOverlapClass,
        )}
      >
        <CloudMotif className="pointer-events-none absolute -right-6 top-2 -z-10 w-44 text-amber-700/15" />
        <CloudMotif className="pointer-events-none absolute -left-8 top-28 -z-10 w-36 text-amber-700/10" />
        <BlossomBranch className="pointer-events-none absolute -left-1 -top-1 -z-10 w-28 sm:w-36" />
        <TempleGate className="mx-auto w-48 sm:w-56" />
        <p className="mt-4 font-display text-2xl font-bold text-brand-700 sm:text-3xl">Gia phả</p>
        <h2 className="font-display text-4xl font-bold leading-tight text-brand-800 sm:text-5xl">
          {clanName(family.name)}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-stone-700">
          Lưu giữ cội nguồn – Kết nối con cháu
          <br />
          Giữ gìn truyền thống tốt đẹp của dòng họ qua các thế hệ.
        </p>
        <Mountains className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-20 w-full" />
        <Lotus className="pointer-events-none absolute -bottom-1 -left-2 w-24 sm:w-28" />
        <Lotus className="pointer-events-none absolute -bottom-1 -right-2 w-24 -scale-x-100 sm:w-28" />
      </section>

      {facts.length > 0 ? (
        <section
          aria-label="Thông tin dòng họ"
          className="surface mx-3 grid gap-2 p-3 sm:mx-0 sm:grid-cols-2"
        >
          {facts.map((fact) => (
            <Fact key={fact.label} {...fact} />
          ))}
        </section>
      ) : null}

      <section
        aria-labelledby="about-introduction-title"
        className="surface mx-3 overflow-hidden sm:mx-0"
      >
        <h2
          id="about-introduction-title"
          className="flex items-center gap-2 border-b border-line px-4 py-3 font-semibold text-stone-900 sm:px-5"
        >
          <ScrollText className="size-4 text-brand-700" aria-hidden="true" />
          Lịch sử và truyền thống
        </h2>
        {richTextIsEmpty(introduction) ? (
          <p className="px-6 py-10 text-center text-sm text-stone-500">
            Trưởng họ chưa viết phần giới thiệu dòng họ.
          </p>
        ) : (
          <RichTextView document={introduction} className="px-4 py-5 sm:px-6" />
        )}
      </section>
    </div>
  );
}
