'use client';

import { Bold, ChevronLeft, ChevronRight, EyeOff, PencilLine, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { formatPlanPrice } from '@/lib/pricing-plans';
import { planFeatureText } from '@/lib/plan-catalog';
import { cn } from '@/lib/utils';
import type {
  PlanCatalogEntry,
  PricingFeatureStyle,
  PricingPlan,
  PricingPlanFeatureInput,
} from '@/types/pricing';

type Cell = { value: string; style: PricingFeatureStyle };
type Column = Record<string, Cell>;

/** A saved plan as table cells: one per catalog row, every row filled. */
function columnOf(plan: PricingPlan, catalog: readonly PlanCatalogEntry[]): Column {
  const lines = new Map(plan.features.map((line) => [line.key, line]));
  return Object.fromEntries(
    catalog.map((entry): [string, Cell] => {
      const line = lines.get(entry.key);
      if (entry.kind === 'LIMIT') {
        return [
          entry.key,
          {
            value: line?.value == null ? '' : String(line.value),
            style: line?.style === 'BOLD' ? 'BOLD' : 'NORMAL',
          },
        ];
      }
      return [entry.key, { value: '', style: line?.style ?? 'STRIKETHROUGH' }];
    }),
  );
}

/** Empty means unlimited; anything else goes to the API as typed, which validates the range. */
function limitValue(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

function toLines(column: Column, catalog: readonly PlanCatalogEntry[]): PricingPlanFeatureInput[] {
  return catalog.map((entry) => {
    const cell = column[entry.key] ?? { value: '', style: 'NORMAL' };
    return {
      key: entry.key,
      value: entry.kind === 'LIMIT' ? limitValue(cell.value) : null,
      style: cell.style,
    };
  });
}

function previewText(entry: PlanCatalogEntry, cell: Cell, catalog: readonly PlanCatalogEntry[]) {
  const value = entry.kind === 'LIMIT' ? limitValue(cell.value) : null;
  return planFeatureText(catalog, {
    key: entry.key,
    value: value !== null && Number.isFinite(value) ? value : null,
  });
}

function BoldToggle({
  pressed,
  disabled,
  label,
  onChange,
}: {
  pressed: boolean;
  disabled?: boolean;
  label: string;
  onChange: (pressed: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title="In đậm trên bảng giá"
      disabled={disabled}
      onClick={() => onChange(!pressed)}
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-lg border transition disabled:opacity-40',
        pressed
          ? 'border-brand-700 bg-brand-700 text-white'
          : 'border-gold-500/40 bg-white text-stone-500 hover:border-brand-700/40',
      )}
    >
      <Bold className="size-4" aria-hidden="true" />
    </button>
  );
}

export function PlanFeatureTable({
  plans,
  catalog,
  locked,
  busyId,
  onSave,
  onEdit,
  onRemove,
}: {
  /** In display order. */
  plans: readonly PricingPlan[];
  catalog: readonly PlanCatalogEntry[];
  /** True while another change to the plans is in flight. */
  locked: boolean;
  busyId: string | null;
  onSave: (columns: { id: string; features: PricingPlanFeatureInput[] }[]) => Promise<boolean>;
  onEdit: (plan: PricingPlan) => void;
  onRemove: (plan: PricingPlan) => void;
}) {
  // Unsaved edits sit on top of the saved plans, so plans added, renamed or deleted elsewhere
  // show up here without losing what the admin has typed.
  const [orderOverride, setOrderOverride] = useState<string[] | null>(null);
  const [edits, setEdits] = useState<Record<string, Column>>({});
  const [saving, setSaving] = useState(false);

  const byId = new Map(plans.map((plan) => [plan.id, plan]));
  const savedOrder = plans.map((plan) => plan.id);
  const order = orderOverride
    ? [
        ...orderOverride.filter((id) => byId.has(id)),
        ...savedOrder.filter((id) => !orderOverride.includes(id)),
      ]
    : savedOrder;
  const columns = order.flatMap((id) => {
    const plan = byId.get(id);
    return plan ? [{ plan, cells: { ...columnOf(plan, catalog), ...edits[id] } }] : [];
  });

  const dirty =
    order.join() !== savedOrder.join() ||
    columns.some(
      ({ plan, cells }) =>
        JSON.stringify(toLines(cells, catalog)) !==
        JSON.stringify(toLines(columnOf(plan, catalog), catalog)),
    );

  function setCell(planId: string, key: string, change: Partial<Cell>): void {
    const plan = byId.get(planId);
    if (!plan) return;
    setEdits((current) => {
      const column = { ...columnOf(plan, catalog), ...current[planId] };
      const cell = column[key] ?? { value: '', style: 'NORMAL' };
      return { ...current, [planId]: { ...current[planId], [key]: { ...cell, ...change } } };
    });
  }

  function move(index: number, offset: -1 | 1): void {
    const next = [...order];
    const [id] = next.splice(index, 1);
    if (!id) return;
    next.splice(index + offset, 0, id);
    setOrderOverride(next);
  }

  function revert(): void {
    setOrderOverride(null);
    setEdits({});
  }

  async function save(): Promise<void> {
    setSaving(true);
    const saved = await onSave(
      columns.map(({ plan, cells }) => ({ id: plan.id, features: toLines(cells, catalog) })),
    );
    setSaving(false);
    if (saved) revert();
  }

  const disabled = locked || saving;

  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto rounded-xl border border-gold-500/30 bg-white/80">
        <table className="w-full min-w-max border-collapse text-sm">
          <caption className="sr-only">
            Bảng tính năng: mỗi cột là một gói theo thứ tự hiển thị, mỗi hàng là một tính năng
          </caption>
          <thead>
            <tr className="align-top">
              <th
                scope="col"
                className="sticky left-0 z-10 w-60 min-w-60 bg-white p-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-stone-500"
              >
                Tính năng
              </th>
              {columns.map(({ plan }, index) => (
                <th
                  key={plan.id}
                  scope="col"
                  className="min-w-48 border-l border-gold-500/20 p-3 text-left font-normal"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-brand-950">{plan.name}</p>
                      <p className="text-xs text-stone-500">
                        {formatPlanPrice(plan.price)}
                        {plan.price > 0 && plan.billingPeriod ? `/${plan.billingPeriod}` : ''}
                      </p>
                      {!plan.isActive ? (
                        <span className="mt-1 inline-flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600">
                          <EyeOff className="size-3" aria-hidden="true" />
                          Đang ẩn
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs font-medium text-stone-400" title="Thứ tự hiển thị">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled || index === 0}
                      aria-label={`Chuyển gói ${plan.name} sang trái`}
                      onClick={() => move(index, -1)}
                    >
                      <ChevronLeft className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled || index === columns.length - 1}
                      aria-label={`Chuyển gói ${plan.name} sang phải`}
                      onClick={() => move(index, 1)}
                    >
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      aria-label={`Sửa thông tin gói ${plan.name}`}
                      onClick={() => onEdit(plan)}
                    >
                      <PencilLine className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled || busyId !== null}
                      aria-label={`Xóa gói ${plan.name}`}
                      onClick={() => onRemove(plan)}
                    >
                      {busyId === plan.id ? (
                        <InlineLoader className="size-4" />
                      ) : (
                        <Trash2 className="size-4 text-red-700" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catalog.map((entry) => (
              <tr key={entry.key} className="border-t border-gold-500/20 align-top">
                <th
                  scope="row"
                  className="sticky left-0 z-10 w-60 min-w-60 bg-white p-3 text-left font-normal"
                >
                  <span className="block font-medium text-brand-950">{entry.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-stone-500">
                    {entry.description}
                  </span>
                </th>
                {columns.map(({ plan, cells }) => {
                  const cell = cells[entry.key] ?? { value: '', style: 'NORMAL' };
                  const where = `${entry.label} của gói ${plan.name}`;
                  const included = entry.kind === 'LIMIT' || cell.style !== 'STRIKETHROUGH';
                  return (
                    <td key={plan.id} className="border-l border-gold-500/20 p-2.5">
                      <div className="flex items-center gap-1.5">
                        {entry.kind === 'LIMIT' ? (
                          <input
                            type="number"
                            inputMode="numeric"
                            aria-label={where}
                            min={entry.min}
                            max={entry.max}
                            step={1}
                            placeholder="Không giới hạn"
                            disabled={disabled}
                            value={cell.value}
                            onChange={(event) =>
                              setCell(plan.id, entry.key, { value: event.currentTarget.value })
                            }
                            className="h-9 w-full min-w-0 rounded-lg border border-gold-700/45 bg-[var(--card)] px-2.5 text-sm outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:opacity-60"
                          />
                        ) : (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={included}
                            aria-label={where}
                            disabled={disabled}
                            onClick={() =>
                              setCell(plan.id, entry.key, {
                                style: included ? 'STRIKETHROUGH' : 'NORMAL',
                              })
                            }
                            className={cn(
                              'inline-flex h-9 flex-1 items-center gap-2 rounded-lg border px-2.5 text-sm font-medium transition disabled:opacity-60',
                              included
                                ? 'border-brand-700/40 bg-brand-50 text-brand-900'
                                : 'border-gold-500/40 bg-white text-stone-500',
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition',
                                included ? 'bg-brand-700' : 'bg-stone-300',
                              )}
                            >
                              <span
                                className={cn(
                                  'inline-block size-4 rounded-full bg-white shadow transition-transform',
                                  included ? 'translate-x-4' : 'translate-x-0.5',
                                )}
                              />
                            </span>
                            {included ? 'Có' : 'Không có'}
                          </button>
                        )}
                        <BoldToggle
                          pressed={cell.style === 'BOLD'}
                          disabled={disabled || !included}
                          label={`In đậm ${where}`}
                          onChange={(pressed) =>
                            setCell(plan.id, entry.key, { style: pressed ? 'BOLD' : 'NORMAL' })
                          }
                        />
                      </div>
                      <p
                        className={cn(
                          'mt-1 px-0.5 text-xs leading-5 text-stone-500',
                          cell.style === 'BOLD' && 'font-semibold text-stone-700',
                          !included && 'line-through',
                        )}
                      >
                        {previewText(entry, cell, catalog)}
                      </p>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className="mr-auto text-xs leading-5 text-stone-500">
          {dirty
            ? 'Có thay đổi chưa lưu. Dòng họ chỉ đổi quyền sau khi bạn lưu bảng.'
            : 'Mỗi ô vừa hiện trên bảng giá vừa là quyền áp dụng cho dòng họ dùng gói.'}
        </p>
        <Button type="button" variant="outline" disabled={!dirty || saving} onClick={revert}>
          Hoàn tác
        </Button>
        <Button type="button" disabled={!dirty || disabled} onClick={() => void save()}>
          {saving ? <InlineLoader className="size-4" /> : null}
          Lưu bảng tính năng
        </Button>
      </div>
    </div>
  );
}
