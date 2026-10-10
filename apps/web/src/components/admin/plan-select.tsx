import { formatPlanPrice } from '@/lib/pricing-plans';
import type { PricingPlan } from '@/types/pricing';

const SELECT_CLASS =
  'h-11 w-full rounded-lg border border-gold-700/45 bg-[var(--card)] px-3 text-base outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm';

function planLabel(plan: PricingPlan): string {
  const price =
    plan.price > 0 && plan.billingPeriod
      ? `${formatPlanPrice(plan.price)}/${plan.billingPeriod}`
      : formatPlanPrice(plan.price);
  return `${plan.name} · ${price}${plan.isActive ? '' : ' (đang ẩn)'}`;
}

function entitlementSummary(plan: PricingPlan): string {
  const included = plan.features
    .filter((feature) => feature.style !== 'STRIKETHROUGH')
    .map((feature) => feature.text);
  return `${included.join(' · ')}.`;
}

export function PlanSelect({
  id,
  plans,
  value,
  onChange,
}: {
  id: string;
  plans: readonly PricingPlan[];
  value: string;
  onChange: (planId: string) => void;
}) {
  const selected = plans.find((plan) => plan.id === value) ?? null;
  const hintId = `${id}-hint`;
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-brand-950" htmlFor={id}>
        Gói đã mua
      </label>
      <select
        id={id}
        name="planId"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className={SELECT_CLASS}
        aria-describedby={hintId}
        required
      >
        <option value="" disabled>
          {plans.length ? 'Chọn gói dịch vụ…' : 'Chưa có gói nào'}
        </option>
        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {planLabel(plan)}
          </option>
        ))}
      </select>
      <span id={hintId} className="text-xs leading-5 text-stone-500">
        {selected
          ? entitlementSummary(selected)
          : plans.length
            ? 'Chức năng của dòng họ đi theo gói; đổi chức năng của gói sẽ áp dụng cho mọi dòng họ dùng gói đó.'
            : 'Hãy tạo gói ở mục Bảng giá dịch vụ trước.'}
      </span>
    </div>
  );
}
