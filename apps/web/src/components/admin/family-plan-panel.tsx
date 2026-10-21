'use client';

import {
  CalendarClock,
  CalendarPlus,
  Clock3,
  Crown,
  HardDrive,
  Mail,
  Phone,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';

import { SectionCard } from '@/components/admin/admin-layout';
import { Field } from '@/components/auth/form-fields';
import { PlanCarousel } from '@/components/pricing/plan-carousel';
import { PlanRenewalDialog } from '@/components/admin/plan-renewal-dialog';
import { PricingCard } from '@/components/pricing/pricing-card';
import { Button } from '@/components/ui/button';
import { Presence } from '@/components/ui/presence';
import { SheetDialog } from '@/components/ui/sheet-dialog';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { usageLevel } from '@/lib/family-storage';
import { requestPlanChange } from '@/lib/family-plan-api';
import { formatPhone, phoneDigits } from '@/lib/phone';
import { formatMegabytes } from '@/lib/plan-catalog';
import { formatPlanDuration, formatPlanPrice } from '@/lib/pricing-plans';
import { cn } from '@/lib/utils';
import type { FamilyPlanOverview, PlanChangeRequest, PlanUsage } from '@/types/family-plan';
import type { PricingPlan } from '@/types/pricing';

/** Days before the end date when the expiry turns into a warning. */
const EXPIRY_WARNING_DAYS = 30;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('vi-VN');
}

/** Each way the family's current data is over a plan's limits; empty when it fits. */
function limitsExceeded(overview: FamilyPlanOverview, plan: PricingPlan): string[] {
  const { maxMembers, maxManagers, maxStorageMb } = plan.rights;
  const over: string[] = [];
  if (maxMembers !== null && overview.members.used > maxMembers) {
    over.push(`${overview.members.used} thành viên trên cây (gói cho tối đa ${maxMembers})`);
  }
  if (maxManagers !== null && overview.managers.used > maxManagers) {
    over.push(`${overview.managers.used} tài khoản quản trị chi (gói cho tối đa ${maxManagers})`);
  }
  if (maxStorageMb !== null && overview.storageMb.used > maxStorageMb) {
    over.push(
      `${formatMegabytes(overview.storageMb.used)} lưu trữ (gói cho tối đa ${formatMegabytes(maxStorageMb)})`,
    );
  }
  return over;
}

function priceLabel(plan: { price: number; billingPeriod: string | null }): string {
  return (
    formatPlanPrice(plan.price) +
    (plan.price > 0 && plan.billingPeriod ? `/${plan.billingPeriod}` : '')
  );
}

function UsageMeter({
  icon,
  label,
  usage,
  format = (value) => value.toLocaleString('vi-VN'),
}: {
  icon: ReactNode;
  label: string;
  usage: PlanUsage;
  format?: (value: number) => string;
}) {
  const { used, limit } = usage;
  const ratio = limit === null ? 0 : limit === 0 ? 1 : Math.min(1, used / limit);
  const tone = usageLevel(used, limit);
  return (
    <div className="grid gap-2 rounded-xl border border-gold-500/25 bg-white/80 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-stone-600 [&_svg]:size-4 [&_svg]:text-gold-700">
        {icon}
        {label}
      </p>
      <p className="font-display text-2xl font-bold text-brand-950">
        {format(used)}
        <span className="text-base font-medium text-stone-500">
          {limit === null ? ' · không giới hạn' : ` / ${format(limit)}`}
        </span>
      </p>
      {limit === null ? null : (
        <div
          className="h-2 overflow-hidden rounded-full bg-stone-200"
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={Math.min(used, limit)}
        >
          <div
            className={cn(
              'h-full rounded-full',
              tone === 'full' ? 'bg-red-600' : tone === 'warn' ? 'bg-amber-500' : 'bg-emerald-600',
            )}
            style={{ width: `${Math.max(ratio * 100, used > 0 ? 3 : 0)}%` }}
          />
        </div>
      )}
      {tone === 'full' ? (
        <p className="text-xs font-medium text-red-700">Đã dùng hết giới hạn của gói.</p>
      ) : tone === 'warn' ? (
        <p className="text-xs font-medium text-amber-800">Sắp chạm giới hạn của gói.</p>
      ) : null}
    </div>
  );
}

function ExpiryLine({ overview }: { overview: FamilyPlanOverview }) {
  const { planExpiresAt, daysLeft, expired } = overview;
  if (!planExpiresAt || daysLeft === null) {
    return <span className="text-emerald-800">Không giới hạn thời gian sử dụng</span>;
  }
  if (expired) {
    return (
      <span className="font-semibold text-red-700">
        Đã hết hạn ngày {formatDate(planExpiresAt)}
      </span>
    );
  }
  return (
    <span className={cn(daysLeft <= EXPIRY_WARNING_DAYS && 'font-semibold text-amber-800')}>
      Hết hạn ngày {formatDate(planExpiresAt)} · còn {daysLeft.toLocaleString('vi-VN')} ngày
    </span>
  );
}

function PendingRequestNotice({ request }: { request: PlanChangeRequest }) {
  return (
    <div
      role="status"
      className="flex gap-3 rounded-xl border border-amber-600/30 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
    >
      <Clock3 className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
      <p>
        Bạn đã gửi yêu cầu chuyển sang gói <strong>{request.planName}</strong> ngày{' '}
        {formatDate(request.createdAt)}.{' '}
        {request.status === 'CONTACTED'
          ? 'Quản trị viên đã liên hệ và đang xử lý.'
          : 'Quản trị viên sẽ liên hệ với bạn để xác nhận và hướng dẫn thanh toán.'}{' '}
        Gửi yêu cầu khác sẽ thay thế yêu cầu này.
      </p>
    </div>
  );
}

function PlanTooSmallDialog({
  plan,
  over,
  onClose,
}: {
  plan: PricingPlan;
  over: readonly string[];
  onClose: () => void;
}) {
  return (
    <SheetDialog
      title="Không thể chọn gói này"
      onClose={onClose}
      footer={
        <Button type="button" onClick={onClose}>
          Đã hiểu
        </Button>
      }
    >
      <div className="flex gap-3 rounded-xl border border-amber-600/30 bg-amber-50 px-4 py-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
        <p className="text-sm leading-6 text-amber-950">
          Dữ liệu hiện có của dòng họ vượt giới hạn của gói{' '}
          <strong className="font-semibold">“{plan.name}”</strong>:
        </p>
      </div>
      <ul className="grid gap-2 pl-1 text-sm leading-6 text-stone-700">
        {over.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-red-600" />
            <span>Đang có {line}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm leading-6 text-stone-600">
        Hãy chọn một gói lớn hơn, hoặc giảm bớt dữ liệu cho vừa giới hạn rồi gửi yêu cầu.
      </p>
    </SheetDialog>
  );
}

function PlanChangeDialog({
  familySlug,
  plan,
  defaultName,
  defaultEmail,
  onClose,
  onSent,
}: {
  familySlug: string;
  plan: PricingPlan;
  defaultName: string;
  defaultEmail: string;
  onClose: () => void;
  onSent: (request: PlanChangeRequest) => void;
}) {
  const [fullName, setFullName] = useState(defaultName);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event?: FormEvent<HTMLFormElement>): Promise<void> {
    event?.preventDefault();
    setError(null);
    setSending(true);
    try {
      const request = await requestPlanChange(familySlug, {
        planId: plan.id,
        fullName,
        phone: phoneDigits(phone),
        email: email.trim() || undefined,
      });
      onSent(request);
    } catch (caught: unknown) {
      setError(getApiErrorMessage(caught, 'gửi yêu cầu thay đổi gói'));
      setSending(false);
    }
  }

  return (
    <SheetDialog
      title="Yêu cầu thay đổi gói"
      onClose={onClose}
      busy={sending}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={sending}>
            Hủy
          </Button>
          <Button type="submit" form="plan-change-form" disabled={sending}>
            {sending ? 'Đang gửi…' : 'Gửi yêu cầu'}
          </Button>
        </>
      }
    >
      <form id="plan-change-form" className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <div className="rounded-xl border border-gold-500/30 bg-gold-50/70 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-800">Gói đã chọn</p>
          <p className="font-display text-lg font-bold text-brand-900">{plan.name}</p>
          <p className="text-sm text-stone-600">
            {priceLabel(plan)} · Thời hạn{' '}
            {formatPlanDuration(plan.rights.durationMonths).toLowerCase()}
          </p>
        </div>
        <p className="text-sm leading-6 text-stone-600">
          Quản trị viên sẽ gọi lại để xác nhận và hướng dẫn thanh toán. Gói mới được áp dụng ngay
          khi thanh toán xong; dữ liệu của dòng họ luôn được giữ nguyên.
        </p>
        <Field
          id="plan-change-name"
          label="Người liên hệ"
          icon={<UserRound />}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
        />
        <Field
          id="plan-change-phone"
          label="Số điện thoại"
          icon={<Phone />}
          value={formatPhone(phone)}
          onChange={(event) => setPhone(phoneDigits(event.target.value))}
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="0912.345.678"
        />
        <Field
          id="plan-change-email"
          label="Email (không bắt buộc)"
          icon={<Mail />}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={191}
          autoComplete="email"
        />
        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
      </form>
    </SheetDialog>
  );
}

export function FamilyPlanPanel({
  familySlug,
  overview,
  plans,
  defaultName,
  defaultEmail,
}: {
  familySlug: string;
  overview: FamilyPlanOverview;
  /** Plans open for sign-up, in display order. */
  plans: readonly PricingPlan[];
  defaultName: string;
  defaultEmail: string;
}) {
  const showToast = useToast();
  const [pending, setPending] = useState(overview.pendingRequest);
  const [chosen, setChosen] = useState<PricingPlan | null>(null);
  const [blocked, setBlocked] = useState<{ plan: PricingPlan; over: string[] } | null>(null);
  const [renewing, setRenewing] = useState(false);
  const listedCurrent = plans.find((plan) => plan.id === overview.plan.id);
  const currentListed = listedCurrent !== undefined;
  // The family keeps the price it signed up at, so it may differ from today's list price.
  const keptPrice = listedCurrent !== undefined && listedCurrent.price !== overview.plan.price;

  function choose(plan: PricingPlan): void {
    const over = limitsExceeded(overview, plan);
    if (over.length === 0) {
      setChosen(plan);
      return;
    }
    setBlocked({ plan, over });
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <SectionCard
        icon={<Crown aria-hidden="true" />}
        title="Gói dịch vụ đang dùng"
        description="Theo dõi hạn dùng và mức sử dụng của dòng họ so với giới hạn của gói."
      >
        <div className="grid gap-5 px-4 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-display text-3xl font-bold text-brand-900">{overview.plan.name}</p>
              <p className="mt-1 text-sm text-stone-600">
                {priceLabel(overview.plan)} · Thời hạn{' '}
                {formatPlanDuration(overview.plan.durationMonths).toLowerCase()}
              </p>
            </div>
            <div className="grid gap-2 sm:justify-items-end">
              <p className="flex items-center gap-2 text-sm">
                <CalendarClock className="size-4 shrink-0 text-gold-700" aria-hidden="true" />
                <ExpiryLine overview={overview} />
              </p>
              {overview.canRenewOnline ? (
                <Button type="button" onClick={() => setRenewing(true)} className="w-full sm:w-auto">
                  <CalendarPlus className="size-4" aria-hidden="true" />
                  Gia hạn gói
                </Button>
              ) : null}
            </div>
          </div>
          {keptPrice && overview.canRenewOnline ? (
            <p className="text-xs text-stone-500">
              Dòng họ gia hạn với giá {priceLabel(overview.plan)} như lúc đăng ký gói, không theo
              giá niêm yết hiện tại.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <UsageMeter
              icon={<UsersRound aria-hidden="true" />}
              label="Thành viên trên cây"
              usage={overview.members}
            />
            <UsageMeter
              icon={<ShieldCheck aria-hidden="true" />}
              label="Tài khoản quản trị chi"
              usage={overview.managers}
            />
            <UsageMeter
              icon={<HardDrive aria-hidden="true" />}
              label="Dung lượng lưu trữ"
              usage={overview.storageMb}
              format={formatMegabytes}
            />
          </div>
          {pending ? <PendingRequestNotice request={pending} /> : null}
        </div>
      </SectionCard>

      <SectionCard
        icon={<Crown aria-hidden="true" />}
        title="Nâng cấp gói"
        description="Chọn gói phù hợp và gửi yêu cầu; quản trị viên sẽ liên hệ để xác nhận và kích hoạt."
      >
        <div className="min-w-0 px-4 pb-5 pt-1 sm:px-7">
          <PlanCarousel names={plans.map((plan) => plan.name)}>
            {plans.map((plan) => {
              const current = plan.id === overview.plan.id;
              return (
                <PricingCard
                  key={plan.id}
                  plan={{
                    ...plan,
                    ctaLabel: pending?.planId === plan.id ? 'Đã gửi yêu cầu' : 'Chọn gói này',
                  }}
                  current={current}
                  onChoose={current ? undefined : () => choose(plan)}
                />
              );
            })}
          </PlanCarousel>
          {currentListed ? null : (
            <p className="pb-4 text-sm text-stone-600">
              Gói “{overview.plan.name}” dòng họ đang dùng không còn được mở bán nên không hiện
              trong danh sách.
            </p>
          )}
        </div>
      </SectionCard>

      <Presence>
        {renewing ? (
          <PlanRenewalDialog familySlug={familySlug} onClose={() => setRenewing(false)} />
        ) : null}
      </Presence>

      <Presence>
        {blocked ? (
          <PlanTooSmallDialog
            plan={blocked.plan}
            over={blocked.over}
            onClose={() => setBlocked(null)}
          />
        ) : null}
      </Presence>

      <Presence>
        {chosen ? (
          <PlanChangeDialog
            familySlug={familySlug}
            plan={chosen}
            defaultName={defaultName}
            defaultEmail={defaultEmail}
            onClose={() => setChosen(null)}
            onSent={(request) => {
              setPending(request);
              setChosen(null);
              showToast({
                kind: 'success',
                message: `Đã gửi yêu cầu chuyển sang gói “${request.planName}”.`,
              });
            }}
          />
        ) : null}
      </Presence>
    </div>
  );
}
