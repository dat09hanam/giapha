'use client';

import {
  ArrowDown,
  ArrowUp,
  Bold,
  Eye,
  EyeOff,
  PencilLine,
  Plus,
  Star,
  Strikethrough,
  Tag,
  Trash2,
  Type,
} from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';

import { SectionCard } from '@/components/admin/admin-layout';
import { Field } from '@/components/auth/form-fields';
import { PricingCard } from '@/components/pricing/pricing-card';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { Segmented } from '@/components/ui/segmented';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { createPricingPlan, deletePricingPlan, updatePricingPlan } from '@/lib/pricing-api';
import {
  formatPlanPrice,
  PRICING_PLAN_ICONS,
  PRICING_PLAN_TONES,
  pricingPlanIcon,
} from '@/lib/pricing-plans';
import { cn } from '@/lib/utils';
import type {
  PricingFeatureStyle,
  PricingPlan,
  PricingPlanInput,
  PricingPlanTone,
} from '@/types/pricing';

type DraftFeature = { key: number; text: string; style: PricingFeatureStyle };

type Draft = Omit<PricingPlanInput, 'price' | 'sortOrder' | 'features'> & {
  id: string | null;
  price: string;
  sortOrder: string;
  features: DraftFeature[];
};

let nextFeatureKey = 1;

function draftFeature(text = '', style: PricingFeatureStyle = 'NORMAL'): DraftFeature {
  return { key: nextFeatureKey++, text, style };
}

function emptyDraft(sortOrder: number): Draft {
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
    sortOrder: String(sortOrder),
    features: [draftFeature()],
  };
}

function toDraft(plan: PricingPlan): Draft {
  return {
    ...plan,
    description: plan.description ?? '',
    billingPeriod: plan.billingPeriod ?? '',
    badge: plan.badge ?? '',
    price: String(plan.price),
    sortOrder: String(plan.sortOrder),
    features: plan.features.map((feature) => draftFeature(feature.text, feature.style)),
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
    sortOrder: Math.max(0, Math.round(Number(draft.sortOrder) || 0)),
    features: draft.features
      .map(({ text, style }) => ({ text: text.trim(), style }))
      .filter((feature) => feature.text.length > 0),
  };
}

function bySortOrder(plans: PricingPlan[]): PricingPlan[] {
  return [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
}

const STYLE_OPTIONS = [
  { value: 'NORMAL', label: 'Thường', icon: <Type aria-hidden="true" /> },
  { value: 'BOLD', label: 'Đậm', icon: <Bold aria-hidden="true" /> },
  { value: 'STRIKETHROUGH', label: 'Gạch', icon: <Strikethrough aria-hidden="true" /> },
] as const;

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

function FeatureListEditor({
  features,
  onChange,
}: {
  features: DraftFeature[];
  onChange: (features: DraftFeature[]) => void;
}) {
  function patch(key: number, change: Partial<DraftFeature>): void {
    onChange(
      features.map((feature) => (feature.key === key ? { ...feature, ...change } : feature)),
    );
  }

  function move(index: number, offset: -1 | 1): void {
    const next = [...features];
    const [line] = next.splice(index, 1);
    if (!line) return;
    next.splice(index + offset, 0, line);
    onChange(next);
  }

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-medium text-brand-950">Tính năng của gói</legend>
      <p className="-mt-1 text-xs leading-5 text-stone-500">
        <strong>In đậm</strong> cho lợi ích nổi bật, <s>gạch ngang</s> cho tính năng gói này không
        có. Dòng để trống sẽ được bỏ qua khi lưu.
      </p>
      <ol className="grid gap-2">
        {features.map((feature, index) => (
          <li
            key={feature.key}
            className="grid gap-2 rounded-xl border border-gold-500/25 bg-white/80 p-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
          >
            <input
              aria-label={`Tính năng ${index + 1}`}
              value={feature.text}
              maxLength={160}
              placeholder="Ví dụ: Tối đa 300 người"
              onChange={(event) => patch(feature.key, { text: event.currentTarget.value })}
              className={cn(
                SELECT_CLASS,
                feature.style === 'BOLD' && 'font-semibold',
                feature.style === 'STRIKETHROUGH' && 'text-stone-500 line-through',
              )}
            />
            <Segmented
              label={`Kiểu chữ của tính năng ${index + 1}`}
              options={STYLE_OPTIONS}
              value={feature.style}
              onChange={(style) => patch(feature.key, { style })}
            />
            <span className="flex justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={index === 0}
                aria-label={`Chuyển tính năng ${index + 1} lên`}
                onClick={() => move(index, -1)}
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={index === features.length - 1}
                aria-label={`Chuyển tính năng ${index + 1} xuống`}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Xóa tính năng ${index + 1}`}
                onClick={() => onChange(features.filter((line) => line.key !== feature.key))}
              >
                <Trash2 className="size-4 text-red-700" aria-hidden="true" />
              </Button>
            </span>
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        disabled={features.length >= 30}
        onClick={() => onChange([...features, draftFeature()])}
      >
        <Plus className="size-4" aria-hidden="true" />
        Thêm tính năng
      </Button>
    </fieldset>
  );
}

function PlanEditor({
  draft,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
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
        description="Thẻ bên phải cập nhật ngay khi bạn sửa, đúng như khách xem ở trang chủ."
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

            <div className="grid gap-4 sm:grid-cols-3">
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
              <Field
                id="plan-order"
                label="Thứ tự hiển thị"
                type="number"
                min={0}
                max={9999}
                value={draft.sortOrder}
                onChange={(event) => set('sortOrder', event.currentTarget.value)}
              />
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

            <FeatureListEditor
              features={draft.features}
              onChange={(features) => set('features', features)}
            />
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start" aria-label="Xem trước thẻ gói">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Xem trước
            </p>
            <div className="pt-3">
              <PricingCard plan={toInput(draft)} />
            </div>
          </aside>
        </div>
      </SectionCard>
    </form>
  );
}

export function PricingPlanManager({ initial }: { initial: PricingPlan[] }) {
  const confirm = useConfirm();
  const showToast = useToast();
  const [plans, setPlans] = useState(() => bySortOrder(initial));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function startNew(): void {
    const lastOrder = plans.at(-1)?.sortOrder ?? 0;
    setDraft(emptyDraft(lastOrder + 10));
  }

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
      showToast({ kind: 'success', message: `Đã lưu gói “${saved.name}”.` });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'lưu gói dịch vụ') });
    } finally {
      setSaving(false);
    }
  }

  async function remove(plan: PricingPlan): Promise<void> {
    if (
      !(await confirm({
        title: `Xóa gói “${plan.name}”?`,
        message:
          'Gói và các tính năng của nó sẽ bị xóa khỏi bảng giá. Muốn tạm ẩn, hãy sửa gói và bỏ chọn “Hiển thị trên trang chủ”.',
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
        description="Các gói hiển thị ở mục Bảng giá trên trang chủ, theo thứ tự hiển thị. Mỗi gói có danh sách tính năng riêng, viết thường, in đậm hoặc gạch ngang."
        actions={
          <Button type="button" onClick={startNew} disabled={draft !== null}>
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
          <ul className="grid gap-3 md:grid-cols-2">
            {plans.map((plan) => {
              const Icon = pricingPlanIcon(plan.icon);
              return (
                <li
                  key={plan.id}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border border-gold-500/30 bg-white/80 p-3',
                    !plan.isActive && 'opacity-70',
                    draft?.id === plan.id && 'ring-2 ring-brand-700/40',
                  )}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold-100 text-wood-700 ring-1 ring-gold-500/40">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-semibold text-brand-950">{plan.name}</span>
                      {plan.badge ? (
                        <span className="rounded bg-brand-700 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          {plan.badge}
                        </span>
                      ) : null}
                      {plan.isFeatured ? (
                        <Star className="size-4 fill-gold-400 text-gold-600" aria-label="Nổi bật" />
                      ) : null}
                      {plan.isActive ? (
                        <Eye className="size-4 text-stone-400" aria-label="Đang hiển thị" />
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-600">
                          <EyeOff className="size-3.5" aria-hidden="true" />
                          Đang ẩn
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-stone-600">
                      {formatPlanPrice(plan.price)}
                      {plan.price > 0 && plan.billingPeriod ? `/${plan.billingPeriod}` : ''} ·{' '}
                      {plan.features.length} tính năng
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Sửa gói ${plan.name}`}
                    disabled={saving}
                    onClick={() => setDraft(toDraft(plan))}
                  >
                    <PencilLine className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Xóa gói ${plan.name}`}
                    disabled={busyId !== null}
                    onClick={() => void remove(plan)}
                  >
                    {busyId === plan.id ? (
                      <InlineLoader className="size-4" />
                    ) : (
                      <Trash2 className="size-4 text-red-700" aria-hidden="true" />
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {draft ? (
        <PlanEditor
          key={draft.id ?? 'new'}
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
