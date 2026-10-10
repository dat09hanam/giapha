'use client';

import { PencilLine, Plus, Tag } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';

import { SectionCard } from '@/components/admin/admin-layout';
import { PlanFeatureTable } from '@/components/admin/plan-feature-table';
import { Field } from '@/components/auth/form-fields';
import { PricingCard } from '@/components/pricing/pricing-card';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { planFeatureText } from '@/lib/plan-catalog';
import {
  createPricingPlan,
  deletePricingPlan,
  savePlanFeatureTable,
  updatePricingPlan,
} from '@/lib/pricing-api';
import { PRICING_PLAN_ICONS, PRICING_PLAN_TONES } from '@/lib/pricing-plans';
import { cn } from '@/lib/utils';
import type {
  PlanCatalogEntry,
  PricingCardPlan,
  PricingPlan,
  PricingPlanFeatureInput,
  PricingPlanInput,
  PricingPlanTone,
} from '@/types/pricing';

type Draft = Omit<PricingPlanInput, 'price'> & { id: string | null; price: string };

function emptyDraft(): Draft {
  return {
    id: null,
    name: '',
    description: '',
    price: '0',
    billingPeriod: 'năm',
    icon: 'sprout',
    tone: 'WOOD',
    badge: '',
    isFeatured: false,
    ctaLabel: 'Đăng ký ngay',
    ctaHref: '#lien-he',
    isActive: true,
  };
}

function toDraft(plan: PricingPlan): Draft {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description ?? '',
    price: String(plan.price),
    billingPeriod: plan.billingPeriod ?? '',
    icon: plan.icon,
    tone: plan.tone,
    badge: plan.badge ?? '',
    isFeatured: plan.isFeatured,
    ctaLabel: plan.ctaLabel,
    ctaHref: plan.ctaHref,
    isActive: plan.isActive,
  };
}

function toInput(draft: Draft): PricingPlanInput {
  return {
    name: draft.name,
    description: draft.description,
    billingPeriod: draft.billingPeriod,
    icon: draft.icon,
    tone: draft.tone,
    badge: draft.badge,
    isFeatured: draft.isFeatured,
    ctaLabel: draft.ctaLabel,
    ctaHref: draft.ctaHref,
    isActive: draft.isActive,
    price: Math.max(0, Math.round(Number(draft.price) || 0)),
  };
}

function toPreview(draft: Draft, features: PricingCardPlan['features']): PricingCardPlan {
  return { ...toInput(draft), features };
}

/** What the API gives a new plan: every catalog row, limits unlimited, options not included. */
function defaultFeatures(catalog: readonly PlanCatalogEntry[]): PricingCardPlan['features'] {
  return catalog.map((entry) => ({
    text: planFeatureText(catalog, { key: entry.key, value: null }),
    style: entry.kind === 'OPTION' ? 'STRIKETHROUGH' : 'NORMAL',
  }));
}

function bySortOrder(plans: PricingPlan[]): PricingPlan[] {
  return [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
}

const BADGE_SUGGESTIONS = ['Phổ biến nhất', 'Khuyên dùng', 'Tiết kiệm nhất', 'Mới'] as const;

const SELECT_CLASS =
  'h-11 w-full rounded-lg border border-gold-700/45 bg-[var(--card)] px-3 text-base outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm';

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-brand-950" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className={SELECT_CLASS}
      >
        {children}
      </select>
    </div>
  );
}

function CheckField({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-gold-500/30 bg-white/70 px-3 py-2.5"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className="mt-0.5 size-4 accent-brand-700"
      />
      <span>
        <span className="block text-sm font-medium text-brand-950">{label}</span>
        <span className="block text-xs leading-5 text-stone-500">{hint}</span>
      </span>
    </label>
  );
}

function PlanEditor({
  features,
  draft,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  /** Display lines for the preview card. */
  features: PricingCardPlan['features'];
  draft: Draft;
  saving: boolean;
  onChange: (draft: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  function set<K extends keyof Draft>(key: K, value: Draft[K]): void {
    onChange({ ...draft, [key]: value });
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSave();
  }

  return (
    <form onSubmit={submit}>
      <SectionCard
        icon={<PencilLine aria-hidden="true" />}
        title={draft.id ? `Sửa gói “${draft.name || 'chưa đặt tên'}”` : 'Thêm gói dịch vụ'}
        description="Thông tin trên thẻ gói. Tính năng và thứ tự hiển thị chỉnh ở bảng phía trên."
        footer={
          <>
            <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <InlineLoader className="size-4" /> : null}
              Lưu gói
            </Button>
          </>
        }
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid content-start gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="plan-name"
                label="Tên gói"
                value={draft.name}
                maxLength={60}
                required
                placeholder="Ví dụ: Gắn Kết"
                onChange={(event) => set('name', event.currentTarget.value)}
              />
              <div className="grid content-start gap-1.5">
                <Field
                  id="plan-badge"
                  label="Nhãn ruy-băng trên thẻ"
                  value={draft.badge ?? ''}
                  maxLength={40}
                  list="plan-badge-suggestions"
                  placeholder="Để trống nếu không gắn nhãn"
                  onChange={(event) => set('badge', event.currentTarget.value)}
                />
                <datalist id="plan-badge-suggestions">
                  {BADGE_SUGGESTIONS.map((badge) => (
                    <option key={badge} value={badge} />
                  ))}
                </datalist>
                <div className="flex flex-wrap gap-1.5">
                  {BADGE_SUGGESTIONS.map((badge) => (
                    <button
                      key={badge}
                      type="button"
                      aria-pressed={draft.badge === badge}
                      onClick={() => set('badge', draft.badge === badge ? '' : badge)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition',
                        draft.badge === badge
                          ? 'border-brand-700 bg-brand-700 text-white'
                          : 'border-gold-500/40 bg-white text-stone-600 hover:border-brand-700/40 hover:bg-gold-50',
                      )}
                    >
                      {badge}
                    </button>
                  ))}
                </div>
              </div>
              <Field
                id="plan-price"
                label="Giá (đồng) — 0 là Miễn phí"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={draft.price}
                onChange={(event) => set('price', event.currentTarget.value)}
              />
              <Field
                id="plan-period"
                label="Kỳ hạn"
                value={draft.billingPeriod ?? ''}
                maxLength={20}
                placeholder="năm, tháng, trọn đời…"
                onChange={(event) => set('billingPeriod', event.currentTarget.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-brand-950" htmlFor="plan-description">
                Mô tả ngắn
              </label>
              <textarea
                id="plan-description"
                rows={2}
                maxLength={200}
                value={draft.description ?? ''}
                placeholder="Ví dụ: Phù hợp cho gia đình, dòng họ nhỏ."
                onChange={(event) => set('description', event.currentTarget.value)}
                className="w-full rounded-lg border border-gold-700/45 bg-[var(--card)] px-3 py-2.5 text-base outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="plan-icon"
                label="Biểu tượng"
                value={draft.icon}
                onChange={(icon) => set('icon', icon)}
              >
                {PRICING_PLAN_ICONS.map((choice) => (
                  <option key={choice.key} value={choice.key}>
                    {choice.label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                id="plan-tone"
                label="Màu chủ đạo"
                value={draft.tone}
                onChange={(tone) => set('tone', tone as PricingPlanTone)}
              >
                {PRICING_PLAN_TONES.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="grid gap-1.5">
              <Field
                id="plan-cta-label"
                label="Chữ trên nút"
                value={draft.ctaLabel}
                maxLength={40}
                required
                placeholder="Đăng ký ngay"
                onChange={(event) => set('ctaLabel', event.currentTarget.value)}
              />
              <p className="text-xs leading-5 text-stone-500">
                Bấm nút sẽ mở form đăng ký gói này; đăng ký mới hiện ở mục Đăng ký dịch vụ.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <CheckField
                id="plan-featured"
                label="Làm nổi bật"
                hint="Thẻ được nâng cao và viền đậm hơn các gói khác."
                checked={draft.isFeatured}
                onChange={(checked) => set('isFeatured', checked)}
              />
              <CheckField
                id="plan-active"
                label="Hiển thị trên trang chủ"
                hint="Bỏ chọn để tạm ẩn gói mà không xóa."
                checked={draft.isActive}
                onChange={(checked) => set('isActive', checked)}
              />
            </div>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start" aria-label="Xem trước thẻ gói">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Xem trước
            </p>
            <div className="pt-3">
              <PricingCard plan={toPreview(draft, features)} />
            </div>
          </aside>
        </div>
      </SectionCard>
    </form>
  );
}

export function PricingPlanManager({
  initial,
  catalog,
}: {
  initial: PricingPlan[];
  catalog: readonly PlanCatalogEntry[];
}) {
  const confirm = useConfirm();
  const showToast = useToast();
  const [plans, setPlans] = useState(() => bySortOrder(initial));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const editing = draft?.id ? plans.find((plan) => plan.id === draft.id) : undefined;

  async function save(): Promise<void> {
    if (!draft) return;
    setSaving(true);
    try {
      const input = toInput(draft);
      const saved = draft.id
        ? await updatePricingPlan(draft.id, input)
        : await createPricingPlan(input);
      setPlans((current) =>
        bySortOrder([...current.filter((plan) => plan.id !== saved.id), saved]),
      );
      setDraft(null);
      showToast({
        kind: 'success',
        message: draft.id
          ? `Đã lưu gói “${saved.name}”.`
          : `Đã thêm gói “${saved.name}”. Hãy đặt tính năng cho gói trong bảng.`,
      });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'lưu gói dịch vụ') });
    } finally {
      setSaving(false);
    }
  }

  async function saveTable(
    columns: { id: string; features: PricingPlanFeatureInput[] }[],
  ): Promise<boolean> {
    try {
      setPlans(bySortOrder(await savePlanFeatureTable(columns)));
      showToast({ kind: 'success', message: 'Đã lưu bảng tính năng và thứ tự các gói.' });
      return true;
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'lưu bảng tính năng') });
      return false;
    }
  }

  async function remove(plan: PricingPlan): Promise<void> {
    if (
      !(await confirm({
        title: `Xóa gói “${plan.name}”?`,
        message:
          'Gói sẽ bị xóa khỏi bảng giá. Muốn tạm ẩn, hãy sửa gói và bỏ chọn “Hiển thị trên trang chủ”.',
        confirmLabel: 'Xóa',
        tone: 'danger',
      }))
    ) {
      return;
    }
    setBusyId(plan.id);
    try {
      await deletePricingPlan(plan.id);
      setPlans((current) => current.filter((entry) => entry.id !== plan.id));
      if (draft?.id === plan.id) setDraft(null);
      showToast({ kind: 'success', message: `Đã xóa gói “${plan.name}”.` });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'xóa gói dịch vụ') });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <SectionCard
        icon={<Tag aria-hidden="true" />}
        title="Bảng giá dịch vụ"
        description="Mỗi cột là một gói, theo đúng thứ tự hiển thị trên trang chủ; mỗi hàng là một tính năng trong danh mục. Dùng mũi tên ở đầu cột để đổi thứ tự."
        actions={
          <Button type="button" onClick={() => setDraft(emptyDraft())} disabled={draft !== null}>
            <Plus className="size-4" aria-hidden="true" />
            Thêm gói
          </Button>
        }
      >
        {plans.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">
            Chưa có gói nào. Mục Bảng giá sẽ ẩn khỏi trang chủ cho tới khi có gói đang hiển thị.
          </p>
        ) : (
          <PlanFeatureTable
            plans={plans}
            catalog={catalog}
            locked={saving}
            busyId={busyId}
            onSave={saveTable}
            onEdit={(plan) => setDraft(toDraft(plan))}
            onRemove={(plan) => void remove(plan)}
          />
        )}
      </SectionCard>

      {draft ? (
        <PlanEditor
          key={draft.id ?? 'new'}
          features={
            editing
              ? editing.features.map(({ text, style }) => ({ text, style }))
              : defaultFeatures(catalog)
          }
          draft={draft}
          saving={saving}
          onChange={setDraft}
          onCancel={() => setDraft(null)}
          onSave={() => void save()}
        />
      ) : null}
    </div>
  );
}
