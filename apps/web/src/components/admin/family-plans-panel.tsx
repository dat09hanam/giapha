'use client';

import { CalendarPlus, ExternalLink, Layers } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { SectionCard } from '@/components/admin/admin-layout';
import { Button } from '@/components/ui/button';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { changeFamilyPlan, renewFamilyPlan, type AdminFamily } from '@/lib/family-api';
import { formatPlanDuration } from '@/lib/pricing-plans';
import { cn } from '@/lib/utils';
import type { PricingPlan } from '@/types/pricing';

const SELECT_CLASS =
  'h-10 w-full rounded-lg border border-gold-700/45 bg-[var(--card)] px-3 text-sm outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:opacity-60 sm:w-52';

const STATUS_LABELS: Record<AdminFamily['status'], string | null> = {
  ACTIVE: null,
  SUSPENDED: 'Tạm khóa',
  ARCHIVED: 'Lưu trữ',
  EXPIRED: 'Hết hạn gói',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('vi-VN');
}

function isExpired(family: AdminFamily): boolean {
  return (
    family.status === 'EXPIRED' ||
    (family.planExpiresAt !== null && new Date(family.planExpiresAt).getTime() <= Date.now())
  );
}

function Usage({ used, limit, unit }: { used: number; limit: number | null; unit: string }) {
  const full = limit !== null && used >= limit;
  return (
    <span className={cn(full && 'font-medium text-amber-800')}>
      {used.toLocaleString('vi-VN')}
      {limit === null ? '' : `/${limit.toLocaleString('vi-VN')}`} {unit}
    </span>
  );
}

function PlanUsage({ family }: { family: AdminFamily }) {
  return (
    <p className="text-xs leading-5 text-stone-500">
      <Usage used={family.memberCount} limit={family.plan.maxMembers} unit="thành viên" />
      {' · '}
      <Usage used={family.managerCount} limit={family.plan.maxManagers} unit="quản trị viên chi" />
      {' · '}
      {family.planExpiresAt ? (
        <span className={cn(isExpired(family) && 'font-medium text-red-700')}>
          {isExpired(family) ? 'Hết hạn' : 'Hạn dùng'} {formatDate(family.planExpiresAt)}
        </span>
      ) : (
        <span>{family.isDemo ? 'Gia phả mẫu không hết hạn' : 'Không hết hạn'}</span>
      )}
    </p>
  );
}

export function FamilyPlansPanel({
  families,
  plans,
}: {
  families: readonly AdminFamily[];
  plans: readonly PricingPlan[];
}) {
  const showToast = useToast();
  // Rows changed here since the page loaded; the list itself comes from the server.
  const [changed, setChanged] = useState<Record<string, AdminFamily>>({});
  const [busySlug, setBusySlug] = useState<string | null>(null);

  async function run(
    family: AdminFamily,
    action: () => Promise<AdminFamily>,
    success: (saved: AdminFamily) => string,
    failure: string,
  ): Promise<void> {
    setBusySlug(family.slug);
    try {
      const saved = await action();
      setChanged((current) => ({ ...current, [saved.slug]: saved }));
      showToast({ kind: 'success', message: success(saved) });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, failure) });
    } finally {
      setBusySlug(null);
    }
  }

  return (
    <SectionCard
      icon={<Layers aria-hidden="true" />}
      title="Gói của từng dòng họ"
      description="Đổi gói khi dòng họ nâng cấp hoặc hạ cấp: gói mới tính thời hạn từ hôm nay. Gia hạn cộng thêm một kỳ của gói hiện tại. Dòng họ hết hạn được mở lại ngay khi đổi gói hoặc gia hạn; dữ liệu đã có luôn được giữ."
    >
      {families.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-500">Chưa có dòng họ nào.</p>
      ) : (
        <ul className="divide-y divide-brand-950/10">
          {families.map((initial) => {
            const family = changed[initial.slug] ?? initial;
            const status = isExpired(family) ? STATUS_LABELS.EXPIRED : STATUS_LABELS[family.status];
            const selectId = `family-plan-${family.id}`;
            const renewable = family.plan.durationMonths !== null && !family.isDemo;
            const busy = busySlug === family.slug;
            return (
              <li
                key={family.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <label htmlFor={selectId} className="font-medium text-brand-950">
                      {family.name}
                    </label>
                    {family.isDemo ? (
                      <span className="rounded bg-gold-100 px-1.5 py-0.5 text-xs font-medium text-wood-700">
                        Gia phả mẫu
                      </span>
                    ) : null}
                    {status ? (
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-xs font-medium',
                          isExpired(family)
                            ? 'bg-red-50 text-red-700'
                            : 'bg-stone-100 text-stone-600',
                        )}
                      >
                        {status}
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href={`/${encodeURIComponent(family.slug)}`}
                    target="_blank"
                    className="inline-flex max-w-full items-center gap-1 break-all text-sm text-stone-500 hover:text-brand-700"
                  >
                    /{family.slug}
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                  </Link>
                  <PlanUsage family={family} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {busy ? <InlineLoader className="size-4 shrink-0 text-stone-400" /> : null}
                  <select
                    id={selectId}
                    value={family.plan.id}
                    disabled={busySlug !== null}
                    onChange={(event) => {
                      const planId = event.currentTarget.value;
                      void run(
                        family,
                        () => changeFamilyPlan(family.slug, planId),
                        (saved) => `${saved.name} đã chuyển sang gói “${saved.plan.name}”.`,
                        'đổi gói dịch vụ',
                      );
                    }}
                    className={SELECT_CLASS}
                  >
                    {plans.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                        {option.isActive ? '' : ' (đang ẩn)'}
                      </option>
                    ))}
                  </select>
                  {renewable ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busySlug !== null}
                      onClick={() =>
                        void run(
                          family,
                          () => renewFamilyPlan(family.slug),
                          (saved) =>
                            `Đã gia hạn ${saved.name} thêm ${formatPlanDuration(saved.plan.durationMonths)}${
                              saved.planExpiresAt ? `, tới ${formatDate(saved.planExpiresAt)}` : ''
                            }.`,
                          'gia hạn gói dịch vụ',
                        )
                      }
                    >
                      <CalendarPlus className="size-3.5" aria-hidden="true" />
                      Gia hạn
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
