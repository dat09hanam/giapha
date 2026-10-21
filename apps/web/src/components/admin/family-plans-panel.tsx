'use client';

import {
  CalendarPlus,
  Check,
  Copy,
  Crown,
  ExternalLink,
  KeyRound,
  Layers,
  Layers2,
  Mail,
  Phone,
  TriangleAlert,
  UserRound,
  UserRoundPen,
} from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { SectionCard } from '@/components/admin/admin-layout';
import { Field } from '@/components/auth/form-fields';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { SheetDialog } from '@/components/ui/sheet-dialog';
import { useToast } from '@/components/ui/toast';
import { EXPIRY_WARNING_DAYS } from '@/lib/admin-overview';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  changeClanHeadContact,
  changeClanHeadEmail,
  changeFamilyPlan,
  renewFamilyPlan,
  resetClanHeadPassword,
  type AdminFamily,
  type ClanHeadCredential,
} from '@/lib/family-api';
import { displayPhone, formatPhone, phoneDigits } from '@/lib/phone';
import { formatMegabytes } from '@/lib/plan-catalog';
import { formatPlanDuration } from '@/lib/pricing-plans';
import { cn } from '@/lib/utils';
import type { PricingPlan } from '@/types/pricing';

const DAY_MS = 24 * 60 * 60 * 1000;

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

/** Whole days left before the plan ends; null when it never ends. */
function daysLeft(family: AdminFamily): number | null {
  if (!family.planExpiresAt) return null;
  return Math.ceil((new Date(family.planExpiresAt).getTime() - Date.now()) / DAY_MS);
}

function Usage({ used, limit, unit }: { used: number; limit: number | null; unit: string }) {
  const full = limit !== null && used >= limit;
  return (
    <span className={cn('block', full && 'font-medium text-amber-800')}>
      {used.toLocaleString('vi-VN')}
      {limit === null ? '' : `/${limit.toLocaleString('vi-VN')}`} {unit}
    </span>
  );
}

function ExpiryCell({ family }: { family: AdminFamily }) {
  if (!family.planExpiresAt) {
    return <span className="text-stone-500">Không hết hạn</span>;
  }
  const left = daysLeft(family) ?? 0;
  const expired = isExpired(family);
  const warning = expired || left <= EXPIRY_WARNING_DAYS;
  return (
    <div className={cn(warning ? 'font-semibold text-red-700' : 'text-wood-800')}>
      <span className="flex items-center gap-1">
        {warning ? <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" /> : null}
        {formatDate(family.planExpiresAt)}
      </span>
      {warning ? (
        <span className="block text-xs font-medium">
          {expired ? 'Đã hết hạn' : `Còn ${left} ngày`}
        </span>
      ) : null}
    </div>
  );
}

function ClanHeadContactDialog({
  family,
  busy,
  onClose,
  onSave,
}: {
  family: AdminFamily;
  busy: boolean;
  onClose: () => void;
  onSave: (contact: { name: string; phone: string; email: string }) => void;
}) {
  const [name, setName] = useState(family.clanHead?.name ?? '');
  const [phone, setPhone] = useState(phoneDigits(family.clanHead?.phone ?? ''));
  const [email, setEmail] = useState(family.clanHead?.email ?? '');
  const emailChanged = email.trim().toLowerCase() !== (family.clanHead?.email ?? '');

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSave({ name: name.trim(), phone, email: email.trim() });
  }

  return (
    <SheetDialog
      title={`Trưởng họ ${family.name}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" form="clan-head-contact-form" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </>
      }
    >
      <form id="clan-head-contact-form" className="grid gap-4" onSubmit={submit}>
        <Field
          id="clan-head-name"
          label="Tên Trưởng họ"
          icon={<UserRound />}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          autoComplete="off"
        />
        <Field
          id="clan-head-phone"
          label="Số điện thoại"
          icon={<Phone />}
          value={formatPhone(phone)}
          onChange={(event) => setPhone(phoneDigits(event.target.value))}
          inputMode="tel"
          autoComplete="off"
          placeholder="0912.345.678"
          pattern="0\d{3}\.\d{3}\.\d{3}"
          title="Số điện thoại gồm 10 chữ số, bắt đầu bằng 0."
        />
        <Field
          id="clan-head-email"
          label="Email"
          icon={<Mail />}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required={family.clanHead?.email !== null}
          maxLength={191}
          autoComplete="off"
        />
        <p className="text-xs leading-5 text-stone-500">
          Dùng đúng email tài khoản Google của Trưởng họ để họ đăng nhập bằng Google vào gia phả này.
          {emailChanged && family.clanHead?.googleLinked
            ? ' Đổi email sẽ gỡ liên kết Google hiện có; lần đăng nhập Google tới bằng email mới sẽ tự liên kết lại.'
            : ''}
        </p>
      </form>
    </SheetDialog>
  );
}

function ClanHeadCredentialDialog({
  familyName,
  credential,
  onClose,
}: {
  familyName: string;
  credential: ClanHeadCredential;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(
      `Tên đăng nhập: ${credential.username}\nMật khẩu: ${credential.password}`,
    );
    setCopied(true);
  }

  return (
    <SheetDialog
      title={`Mật khẩu mới của trưởng họ ${familyName}`}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => void copy()}>
            {copied ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
            {copied ? 'Đã sao chép' : 'Sao chép'}
          </Button>
          <Button type="button" onClick={onClose}>
            Đóng
          </Button>
        </>
      }
    >
      <div className="grid gap-3" role="status">
        <dl className="grid gap-1.5 rounded-xl border bg-white p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-stone-500">Tên đăng nhập</dt>
            <dd className="break-all font-mono font-medium">{credential.username}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-stone-500">Mật khẩu</dt>
            <dd className="break-all font-mono font-medium">{credential.password}</dd>
          </div>
        </dl>
        <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Mật khẩu tạm chỉ hiển thị một lần tại đây. Hãy gửi riêng cho trưởng họ; họ sẽ phải đổi mật
          khẩu ở lần đăng nhập tới.
        </p>
      </div>
    </SheetDialog>
  );
}

function DemoPlanDialog({
  family,
  plans,
  busy,
  onClose,
  onSave,
}: {
  family: AdminFamily;
  plans: readonly PricingPlan[];
  busy: boolean;
  onClose: () => void;
  onSave: (planId: string) => void;
}) {
  const [planId, setPlanId] = useState(family.plan.id);
  return (
    <SheetDialog
      title={`Gói của ${family.name}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button
            type="button"
            disabled={busy || planId === family.plan.id}
            onClick={() => onSave(planId)}
          >
            {busy ? 'Đang lưu…' : 'Đổi gói'}
          </Button>
        </>
      }
    >
      <div className="grid gap-1.5">
        <label htmlFor="demo-family-plan" className="text-sm font-medium text-brand-950">
          Gói dịch vụ
        </label>
        <select
          id="demo-family-plan"
          value={planId}
          onChange={(event) => setPlanId(event.currentTarget.value)}
          className="h-11 w-full rounded-lg border border-gold-700/45 bg-[var(--card)] px-3 text-base outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm"
        >
          {plans.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
              {option.isActive ? '' : ' (đang ẩn)'}
            </option>
          ))}
        </select>
      </div>
    </SheetDialog>
  );
}

type OpenDialog =
  | { kind: 'contact'; slug: string }
  | { kind: 'plan'; slug: string }
  | { kind: 'credential'; slug: string; credential: ClanHeadCredential };

const HEAD_CELL = 'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gold-800';
const CELL = 'px-3 py-3 align-top';

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
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const confirm = useConfirm();

  const rows = families.map((initial) => changed[initial.slug] ?? initial);
  const dialogFamily = dialog ? rows.find((family) => family.slug === dialog.slug) : undefined;

  async function resetHeadPassword(family: AdminFamily): Promise<void> {
    if (
      !(await confirm({
        title: `Cấp lại mật khẩu trưởng họ ${family.name}?`,
        message:
          'Mật khẩu cũ hết hiệu lực ngay, tài khoản trưởng họ bị đăng xuất khỏi mọi thiết bị và phải đổi mật khẩu ở lần đăng nhập tới.',
        confirmLabel: 'Cấp lại',
      }))
    )
      return;
    setBusySlug(family.slug);
    try {
      const credential = await resetClanHeadPassword(family.slug);
      setDialog({ kind: 'credential', slug: family.slug, credential });
      showToast({ kind: 'success', message: `Đã cấp lại mật khẩu trưởng họ ${family.name}.` });
    } catch (error: unknown) {
      showToast({
        kind: 'error',
        message: getApiErrorMessage(error, 'cấp lại mật khẩu trưởng họ'),
      });
    } finally {
      setBusySlug(null);
    }
  }

  async function run(
    family: AdminFamily,
    action: () => Promise<AdminFamily>,
    success: (saved: AdminFamily) => string,
    failure: string,
  ): Promise<boolean> {
    setBusySlug(family.slug);
    try {
      const saved = await action();
      setChanged((current) => ({ ...current, [saved.slug]: saved }));
      showToast({ kind: 'success', message: success(saved) });
      return true;
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, failure) });
      return false;
    } finally {
      setBusySlug(null);
    }
  }

  async function saveContact(
    family: AdminFamily,
    contact: { name: string; phone: string; email: string },
  ): Promise<void> {
    const head = family.clanHead;
    const contactChanged =
      contact.name !== (head?.name ?? '') || contact.phone !== phoneDigits(head?.phone ?? '');
    const emailChanged = contact.email !== '' && contact.email.toLowerCase() !== head?.email;
    if (!contactChanged && !emailChanged) {
      setDialog(null);
      return;
    }
    const saved = await run(
      family,
      async () => {
        let latest = family;
        if (contactChanged) {
          latest = await changeClanHeadContact(family.slug, {
            name: contact.name,
            phone: contact.phone,
          });
          // Kept even if the email change below is refused.
          const saved = latest;
          setChanged((current) => ({ ...current, [saved.slug]: saved }));
        }
        if (emailChanged) latest = await changeClanHeadEmail(family.slug, contact.email);
        return latest;
      },
      (result) => `Đã cập nhật thông tin trưởng họ ${result.name}.`,
      'cập nhật thông tin trưởng họ',
    );
    if (saved) setDialog(null);
  }

  function actionsFor(family: AdminFamily): ActionMenuItem[] {
    const items: ActionMenuItem[] = [];
    if (family.isDemo) {
      items.push({
        key: 'plan',
        label: 'Đổi gói',
        icon: <Layers2 aria-hidden="true" />,
        onSelect: () => setDialog({ kind: 'plan', slug: family.slug }),
      });
    }
    if (family.plan.durationMonths !== null && !family.isDemo) {
      items.push({
        key: 'renew',
        label: `Gia hạn thêm ${formatPlanDuration(family.plan.durationMonths).toLowerCase()}`,
        icon: <CalendarPlus aria-hidden="true" />,
        onSelect: () =>
          void run(
            family,
            () => renewFamilyPlan(family.slug),
            (saved) =>
              `Đã gia hạn ${saved.name} thêm ${formatPlanDuration(saved.plan.durationMonths)}${
                saved.planExpiresAt ? `, tới ${formatDate(saved.planExpiresAt)}` : ''
              }.`,
            'gia hạn gói dịch vụ',
          ),
      });
    }
    if (family.clanHead) {
      items.push({
        key: 'contact',
        label: 'Sửa thông tin trưởng họ',
        icon: <UserRoundPen aria-hidden="true" />,
        onSelect: () => setDialog({ kind: 'contact', slug: family.slug }),
      });
    }
    if (!family.isDemo) {
      items.push({
        key: 'password',
        label: 'Cấp lại mật khẩu',
        icon: <KeyRound aria-hidden="true" />,
        onSelect: () => void resetHeadPassword(family),
      });
    }
    items.push({
      key: 'open',
      label: 'Mở trang gia phả',
      icon: <ExternalLink aria-hidden="true" />,
      href: `/${encodeURIComponent(family.slug)}`,
    });
    return items;
  }

  return (
    <SectionCard
      icon={<Layers aria-hidden="true" />}
      title="Gói của từng dòng họ"
      description={`Gói của dòng họ chỉ đổi khi xác nhận yêu cầu nâng cấp của trưởng họ ở mục Đăng ký dịch vụ; gói mới tính thời hạn từ hôm nay. Gia hạn cộng thêm một kỳ của gói hiện tại. Dòng họ hết hạn được mở lại ngay khi đổi gói hoặc gia hạn; dữ liệu đã có luôn được giữ. Hạn dùng còn dưới ${EXPIRY_WARNING_DAYS} ngày được tô đỏ.`}
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-500">Chưa có dòng họ nào.</p>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[68rem] border-collapse text-sm">
            <caption className="sr-only">
              Các dòng họ cùng gói đang dùng, thời hạn, mức sử dụng và trưởng họ
            </caption>
            <thead>
              <tr className="border-b border-gold-500/40 bg-gold-50/60">
                <th scope="col" className={HEAD_CELL}>
                  Dòng họ
                </th>
                <th scope="col" className={HEAD_CELL}>
                  Gói
                </th>
                <th scope="col" className={HEAD_CELL}>
                  Sử dụng
                </th>
                <th scope="col" className={HEAD_CELL}>
                  Ngày đăng ký
                </th>
                <th scope="col" className={HEAD_CELL}>
                  Hết hạn
                </th>
                <th scope="col" className={HEAD_CELL}>
                  Trưởng họ
                </th>
                <th scope="col" className={HEAD_CELL}>
                  Số điện thoại
                </th>
                <th scope="col" className={HEAD_CELL}>
                  Email
                </th>
                <th scope="col" className={cn(HEAD_CELL, 'text-right')}>
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-950/10">
              {rows.map((family) => {
                const status = isExpired(family)
                  ? STATUS_LABELS.EXPIRED
                  : STATUS_LABELS[family.status];
                const head = family.clanHead;
                const left = daysLeft(family);
                const warning = isExpired(family) || (left !== null && left <= EXPIRY_WARNING_DAYS);
                return (
                  <tr key={family.id} className={cn(warning && 'bg-red-50/50')}>
                    <td className={cn(CELL, 'max-w-60')}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-brand-950">{family.name}</span>
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
                                ? 'bg-red-100 text-red-700'
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
                        className="inline-flex max-w-full items-center gap-1 break-all text-xs text-stone-500 hover:text-brand-700"
                      >
                        /{family.slug}
                        <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                      </Link>
                    </td>
                    <td className={CELL}>
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-brand-900">
                        <Crown className="size-3.5 text-gold-700" aria-hidden="true" />
                        {family.plan.name}
                      </span>
                    </td>
                    <td className={cn(CELL, 'whitespace-nowrap text-xs leading-5 text-stone-600')}>
                      <Usage
                        used={family.memberCount}
                        limit={family.plan.maxMembers}
                        unit="thành viên"
                      />
                      <Usage
                        used={family.managerCount}
                        limit={family.plan.maxManagers}
                        unit="quản trị viên"
                      />
                      <span
                        className={cn(
                          'block',
                          family.plan.maxStorageMb !== null &&
                            family.storageUsedMb >= family.plan.maxStorageMb &&
                            'font-medium text-amber-800',
                        )}
                      >
                        {formatMegabytes(family.storageUsedMb)}
                        {family.plan.maxStorageMb === null
                          ? ''
                          : `/${formatMegabytes(family.plan.maxStorageMb)}`}
                      </span>
                    </td>
                    <td className={cn(CELL, 'whitespace-nowrap text-wood-800')}>
                      {formatDate(family.createdAt)}
                    </td>
                    <td className={cn(CELL, 'whitespace-nowrap')}>
                      <ExpiryCell family={family} />
                    </td>
                    <td className={cn(CELL, 'max-w-44')}>
                      {head?.name ? (
                        <span className="text-wood-800">{head.name}</span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className={cn(CELL, 'whitespace-nowrap')}>
                      {head?.phone ? (
                        <a
                          href={`tel:${head.phone.replace(/[^\d+]/g, '')}`}
                          className="text-wood-800 hover:text-brand-800 hover:underline"
                        >
                          {displayPhone(head.phone)}
                        </a>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className={cn(CELL, 'max-w-60')}>
                      {head?.email ? (
                        <a
                          href={`mailto:${head.email}`}
                          className="break-all text-wood-800 hover:text-brand-800 hover:underline"
                        >
                          {head.email}
                        </a>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                      {head?.googleLinked ? (
                        <span className="mt-1 block w-fit rounded bg-sky-50 px-1.5 py-0.5 text-xs font-medium text-sky-800 ring-1 ring-inset ring-sky-200">
                          Đã liên kết Google
                        </span>
                      ) : null}
                    </td>
                    <td className={cn(CELL, 'text-right')}>
                      <div className="inline-flex items-center gap-2">
                        {busySlug === family.slug ? (
                          <InlineLoader className="size-4 shrink-0 text-stone-400" />
                        ) : null}
                        <ActionMenu
                          label={`Thao tác cho ${family.name}`}
                          items={actionsFor(family)}
                          disabled={busySlug !== null}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialog?.kind === 'contact' && dialogFamily ? (
        <ClanHeadContactDialog
          family={dialogFamily}
          busy={busySlug === dialogFamily.slug}
          onClose={() => setDialog(null)}
          onSave={(contact) => void saveContact(dialogFamily, contact)}
        />
      ) : null}
      {dialog?.kind === 'plan' && dialogFamily ? (
        <DemoPlanDialog
          family={dialogFamily}
          plans={plans}
          busy={busySlug === dialogFamily.slug}
          onClose={() => setDialog(null)}
          onSave={(planId) =>
            void run(
              dialogFamily,
              () => changeFamilyPlan(dialogFamily.slug, planId),
              (saved) => `${saved.name} đã chuyển sang gói “${saved.plan.name}”.`,
              'đổi gói dịch vụ',
            ).then((saved) => {
              if (saved) setDialog(null);
            })
          }
        />
      ) : null}
      {dialog?.kind === 'credential' && dialogFamily ? (
        <ClanHeadCredentialDialog
          familyName={dialogFamily.name}
          credential={dialog.credential}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </SectionCard>
  );
}
