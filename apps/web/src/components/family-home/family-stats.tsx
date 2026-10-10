import { HeartHandshake, HeartPulse, Layers, Network, UsersRound } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { familyHref } from '@/lib/family-nav';
import type { FamilyStats as Stats } from '@/types/family-tree';

function count(value: number): string {
  return value.toLocaleString('vi-VN');
}

function StatTile({
  icon,
  label,
  value,
  unit,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  detail: string;
}) {
  return (
    <article className="flex min-w-0 items-start gap-3 rounded-xl border border-line/70 bg-paper/70 p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-gold-100 text-brand-700 ring-1 ring-inset ring-gold-500/30 [&_svg]:size-5">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-stone-500">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold leading-none text-wood-900 sm:text-3xl">
          {value}
          {unit ? (
            <span className="ml-1 text-sm font-semibold text-stone-500 sm:text-base">{unit}</span>
          ) : null}
        </p>
        <p className="mt-1.5 text-xs leading-5 text-stone-500">{detail}</p>
      </div>
    </article>
  );
}

export function FamilyStats({ slug, stats }: { slug: string; stats: Stats }) {
  const updated = stats.updatedAt
    ? new Date(stats.updatedAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  return (
    <section aria-labelledby="family-stats-title" className="surface min-w-0 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2
          id="family-stats-title"
          className="font-display text-lg font-bold text-wood-900 sm:text-xl"
        >
          Dòng họ qua những con số
        </h2>
        {updated ? (
          <p className="text-xs text-stone-500">Gia phả cập nhật lần cuối ngày {updated}</p>
        ) : null}
      </div>

      {stats.members === 0 ? (
        <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-dashed border-line bg-paper/50 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-stone-600">Cây gia phả chưa có thành viên nào được ghi lại.</p>
          <Link
            href={familyHref(slug, 'gia-pha')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            <Network className="size-4" aria-hidden="true" />
            Xem cây gia phả
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon={<UsersRound aria-hidden="true" />}
            label="Thành viên"
            value={count(stats.members)}
            unit="người"
            detail={`${count(stats.male)} nam · ${count(stats.female)} nữ`}
          />
          <StatTile
            icon={<Layers aria-hidden="true" />}
            label="Số đời"
            value={count(stats.generations)}
            unit="đời"
            detail={
              stats.firstGeneration !== null && stats.lastGeneration !== null
                ? `Từ đời thứ ${stats.firstGeneration} đến đời thứ ${stats.lastGeneration}`
                : 'Chưa ghi đời'
            }
          />
          <StatTile
            icon={<HeartPulse aria-hidden="true" />}
            label="Còn sống"
            value={count(stats.living)}
            unit="người"
            detail={`${count(stats.deceased)} người đã khuất`}
          />
          <StatTile
            icon={<HeartHandshake aria-hidden="true" />}
            label="Gia đình"
            value={count(stats.couples)}
            unit="cặp"
            detail="Cặp vợ chồng được ghi trên cây"
          />
        </div>
      )}
    </section>
  );
}
