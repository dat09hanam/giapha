'use client';

import {
  BarChart3,
  ClipboardList,
  HandCoins,
  HardDrive,
  Network,
  Phone,
  TriangleAlert,
  UsersRound,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import {
  EXPIRY_WARNING_DAYS,
  type AdminOverview as Overview,
  type ExpiringFamily,
  type MonthCount,
  type NamedCount,
} from '@/lib/admin-overview';
import { displayPhone } from '@/lib/phone';
import { formatMegabytes } from '@/lib/plan-catalog';
import { cn } from '@/lib/utils';

/** The one series color: brand-600, which clears the chart lightness band and 3:1 on the card. */
const SERIES = 'bg-brand-600';

function formatCount(value: number): string {
  return value.toLocaleString('vi-VN');
}

function formatMoney(value: number): string {
  return `${value.toLocaleString('vi-VN')}đ`;
}

/** A round axis top: 4, 10, 20, 50, 100… so the half-way tick is a whole number too. */
function axisTop(max: number): number {
  if (max <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 5, 10].find((factor) => max <= factor * power) ?? 10;
  return step * power;
}

function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('heritage-panel grid content-start gap-4 p-4 sm:p-6', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-stone-900">{title}</h3>
          {description ? <p className="mt-0.5 text-sm text-stone-500">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </Card>
  );
}

function StatTile({
  icon,
  label,
  value,
  note,
  alert = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note?: ReactNode;
  alert?: boolean;
}) {
  return (
    <Card
      className={cn(
        'heritage-panel flex gap-3.5 p-4 sm:p-5',
        alert && 'border-red-300 bg-red-50/60',
      )}
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-lg ring-1 ring-inset [&_svg]:size-5',
          alert
            ? 'bg-red-100 text-red-700 ring-red-200'
            : 'bg-gold-100 text-brand-700 ring-gold-500/30',
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-stone-600">{label}</p>
        <p
          className={cn(
            'text-2xl font-semibold leading-tight',
            alert ? 'text-red-700' : 'text-stone-900',
          )}
        >
          {value}
        </p>
        {note ? <p className="mt-0.5 text-xs text-stone-500">{note}</p> : null}
      </div>
    </Card>
  );
}

function ColumnChart({ data, unit }: { data: readonly MonthCount[]; unit: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(0, ...data.map((entry) => entry.count));
  const top = axisTop(max);
  const peak = data.findIndex((entry) => entry.count === max && max > 0);
  const last = data.length - 1;
  const shown = active === null ? null : data[active];

  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        {/* Y axis: clean ticks at 0, half and top. */}
        <div className="relative h-48 w-7 shrink-0 text-right text-[11px] tabular-nums text-stone-400">
          {[top, top / 2, 0].map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${(1 - tick / top) * 100}%` }}
            >
              {formatCount(tick)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="relative h-48" onPointerLeave={() => setActive(null)}>
            {[0, 0.5].map((fraction) => (
              <span
                key={fraction}
                aria-hidden="true"
                className="absolute inset-x-0 h-px bg-gold-500/20"
                style={{ top: `${fraction * 100}%` }}
              />
            ))}
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gold-700/35" />
            <div className="absolute inset-0 flex">
              {data.map((entry, index) => {
                const labelled = entry.count > 0 && (index === peak || index === last);
                return (
                  <button
                    key={entry.key}
                    type="button"
                    aria-label={`${entry.label}: ${formatCount(entry.count)} ${unit}`}
                    onPointerEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                    className="group relative flex h-full min-w-0 flex-1 items-end justify-center outline-none"
                  >
                    <span
                      className={cn(
                        'relative w-3/5 max-w-6 rounded-t transition-opacity sm:rounded-t-[4px]',
                        SERIES,
                        active !== null && active !== index && 'opacity-55',
                        'group-focus-visible:ring-2 group-focus-visible:ring-[var(--ring)] group-focus-visible:ring-offset-2',
                      )}
                      style={{ height: `${(entry.count / top) * 100}%` }}
                    >
                      {labelled ? (
                        <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-xs font-semibold tabular-nums text-stone-700">
                          {formatCount(entry.count)}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
            {shown && active !== null ? (
              <div
                role="status"
                className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-gold-500/40 bg-[var(--card)] px-3 py-2 text-xs shadow-lg"
                style={{
                  left: `${((active + 0.5) / data.length) * 100}%`,
                  bottom: `calc(${(shown.count / top) * 100}% + 1.75rem)`,
                }}
              >
                <span className="block text-base font-semibold text-stone-900">
                  {formatCount(shown.count)}
                </span>
                <span className="flex items-center gap-1.5 text-stone-500">
                  <span aria-hidden="true" className={cn('h-0.5 w-3 rounded', SERIES)} />
                  {unit} · {shown.label}
                </span>
              </div>
            ) : null}
          </div>
          <div className="mt-1.5 flex text-[11px] text-stone-500">
            {data.map((entry, index) => (
              <span
                key={entry.key}
                className={cn(
                  'min-w-0 flex-1 truncate text-center',
                  // Every other month on narrow screens keeps the labels from colliding.
                  index % 2 === 1 && index !== last && 'hidden sm:block',
                )}
              >
                {entry.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-xs font-medium text-wood-700 hover:text-brand-800">
          Xem dạng bảng
        </summary>
        <table className="mt-2 w-full max-w-sm text-left text-sm">
          <thead>
            <tr className="border-b border-gold-500/30 text-xs text-stone-500">
              <th scope="col" className="py-1.5 font-medium">
                Tháng
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                {unit}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-500/15 tabular-nums">
            {data.map((entry) => (
              <tr key={entry.key}>
                <td className="py-1.5 text-stone-700">{entry.label}</td>
                <td className="py-1.5 text-right text-stone-900">{formatCount(entry.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function BarList({
  data,
  unit,
  empty,
}: {
  data: readonly NamedCount[];
  unit: string;
  empty: string;
}) {
  const max = Math.max(0, ...data.map((entry) => entry.count));
  if (max === 0) {
    return <p className="py-6 text-center text-sm text-stone-500">{empty}</p>;
  }
  return (
    <ul className="grid gap-3">
      {data.map((entry) => (
        <li key={entry.label} className="grid gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-stone-700" title={entry.label}>
              {entry.label}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-stone-900">
              {formatCount(entry.count)}
              <span className="sr-only"> {unit}</span>
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gold-100/80" aria-hidden="true">
            <div
              className={cn('h-full rounded-full', SERIES)}
              style={{ width: `${Math.max((entry.count / max) * 100, entry.count > 0 ? 2 : 0)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ExpiringList({ entries }: { entries: readonly ExpiringFamily[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-stone-500">
        Không có dòng họ nào hết hạn trong {EXPIRY_WARNING_DAYS} ngày tới.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-brand-950/10">
      {entries.map(({ family, daysLeft }) => {
        const expired = family.status === 'EXPIRED' || daysLeft <= 0;
        return (
          <li key={family.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-brand-950">{family.name}</p>
              <p className="truncate text-xs text-stone-500">
                Gói {family.plan.name}
                {family.clanHead?.name ? ` · ${family.clanHead.name}` : ''}
              </p>
            </div>
            {family.clanHead?.phone ? (
              <a
                href={`tel:${family.clanHead.phone.replace(/[^\d+]/g, '')}`}
                className="inline-flex items-center gap-1.5 text-sm text-wood-800 hover:text-brand-800 hover:underline"
              >
                <Phone className="size-3.5 text-gold-700" aria-hidden="true" />
                {displayPhone(family.clanHead.phone)}
              </a>
            ) : null}
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-red-700">
              <TriangleAlert className="size-3.5" aria-hidden="true" />
              {expired
                ? 'Đã hết hạn'
                : `Còn ${daysLeft} ngày · ${new Date(family.planExpiresAt ?? '').toLocaleDateString('vi-VN')}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

type TrendKind = 'families' | 'registrations';

export function AdminOverview({ overview }: { overview: Overview }) {
  const [trend, setTrend] = useState<TrendKind>('families');
  const monthDelta = overview.familiesThisMonth - overview.familiesLastMonth;
  const expiringSoon = overview.expiring.length - overview.expiredCount;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          icon={<Network aria-hidden="true" />}
          label="Dòng họ đang phục vụ"
          value={formatCount(overview.families)}
          note={
            <>
              {formatCount(overview.familiesThisMonth)} dòng họ mới tháng này
              {monthDelta !== 0 ? (
                <span className={cn('font-medium', monthDelta > 0 ? 'text-emerald-700' : '')}>
                  {' '}
                  ({monthDelta > 0 ? '+' : '−'}
                  {Math.abs(monthDelta)} so với tháng trước)
                </span>
              ) : null}
            </>
          }
        />
        <StatTile
          icon={<UsersRound aria-hidden="true" />}
          label="Thành viên trên các gia phả"
          value={formatCount(overview.members)}
          note={
            overview.families > 0
              ? `Trung bình ${formatCount(Math.round(overview.members / overview.families))} người mỗi dòng họ`
              : undefined
          }
        />
        <StatTile
          icon={<TriangleAlert aria-hidden="true" />}
          label={`Hết hạn trong ${EXPIRY_WARNING_DAYS} ngày`}
          value={formatCount(expiringSoon)}
          note={`${formatCount(overview.expiredCount)} dòng họ đã hết hạn`}
          alert={overview.expiring.length > 0}
        />
        <StatTile
          icon={<ClipboardList aria-hidden="true" />}
          label="Đăng ký dịch vụ cần xử lý"
          value={formatCount(overview.openRegistrations)}
          note={`${formatCount(overview.unseenRegistrations)} đăng ký chưa xem`}
        />
        <StatTile
          icon={<HandCoins aria-hidden="true" />}
          label="Hoa hồng đại sứ chưa trả"
          value={formatMoney(overview.unpaidCommission)}
          note={`${formatCount(overview.unpaidCommissionCount)} khoản · ${formatCount(overview.activeAmbassadors)} đại sứ đang hoạt động`}
        />
        <StatTile
          icon={<HardDrive aria-hidden="true" />}
          label="Dung lượng lưu trữ đã dùng"
          value={formatMegabytes(overview.storageMb)}
          note="Ảnh và tư liệu của mọi dòng họ"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title={trend === 'families' ? 'Dòng họ mới theo tháng' : 'Đăng ký dịch vụ theo tháng'}
          description="12 tháng gần nhất"
          actions={
            <Segmented
              label="Chọn số liệu theo tháng"
              options={[
                { value: 'families', label: 'Dòng họ mới' },
                { value: 'registrations', label: 'Đăng ký' },
              ]}
              value={trend}
              onChange={setTrend}
              className="sm:w-64"
            />
          }
        >
          <ColumnChart
            key={trend}
            data={trend === 'families' ? overview.familiesByMonth : overview.registrationsByMonth}
            unit={trend === 'families' ? 'dòng họ mới' : 'đăng ký'}
          />
        </Panel>
        <Panel title="Dòng họ theo gói" description="Gói đang dùng của từng dòng họ">
          <BarList data={overview.familiesByPlan} unit="dòng họ" empty="Chưa có dòng họ nào." />
        </Panel>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title="Sắp hết hạn"
          description={`Dòng họ đã hết hạn hoặc còn dưới ${EXPIRY_WARNING_DAYS} ngày, gần hết hạn nhất lên trước`}
          actions={
            <a
              href="#dong-ho"
              className="shrink-0 whitespace-nowrap text-sm font-medium text-wood-700 hover:text-brand-800 hover:underline"
            >
              Xem bảng dòng họ
            </a>
          }
        >
          <ExpiringList entries={overview.expiring} />
        </Panel>
        <div className="grid content-start gap-6">
          <Panel title="Đăng ký dịch vụ theo trạng thái">
            <BarList
              data={overview.registrationsByStatus}
              unit="đăng ký"
              empty="Chưa có đăng ký nào."
            />
          </Panel>
          <Panel title="Dòng họ đông thành viên nhất" description="Số người trên gia phả">
            <BarList
              data={overview.largestFamilies}
              unit="thành viên"
              empty="Chưa có thành viên nào."
            />
          </Panel>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-stone-400">
        <BarChart3 className="size-3.5" aria-hidden="true" />
        Số liệu không tính gia phả mẫu.
      </p>
    </div>
  );
}
