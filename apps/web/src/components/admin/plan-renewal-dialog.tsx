'use client';

import { Check, CheckCircle2, Copy, Hourglass, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { SheetDialog } from '@/components/ui/sheet-dialog';
import { getApiErrorMessage } from '@/lib/api-error';
import { createPlanRenewal, getPlanRenewal } from '@/lib/family-plan-api';
import { formatPlanDuration } from '@/lib/pricing-plans';
import type { PlanRenewal } from '@/types/family-plan';

/** How often the dialog asks whether the transfer has arrived. */
const POLL_MS = 4000;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('vi-VN');
}

function formatMoney(value: number): string {
  return `${value.toLocaleString('vi-VN')}đ`;
}

function CopyRow({ label, value, shown }: { label: string; value: string; shown?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <dt className="text-xs text-stone-500">{label}</dt>
        <dd className="break-all font-semibold text-stone-900">{shown ?? value}</dd>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Sao chép ${label.toLowerCase()}`}
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => setCopied(true));
        }}
      >
        {copied ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}

export function PlanRenewalDialog({
  familySlug,
  onClose,
}: {
  familySlug: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [renewal, setRenewal] = useState<PlanRenewal | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    createPlanRenewal(familySlug)
      .then((created) => {
        if (active) setRenewal(created);
      })
      .catch((caught: unknown) => {
        if (active) setError(getApiErrorMessage(caught, 'tạo mã thanh toán gia hạn'));
      });
    return () => {
      active = false;
    };
  }, [familySlug]);

  const paymentId = renewal?.status === 'PENDING' ? renewal.id : null;
  useEffect(() => {
    if (!paymentId) return;
    const timer = window.setInterval(() => {
      // A failed check is retried on the next tick; the transfer details stay on screen.
      getPlanRenewal(familySlug, paymentId)
        .then((latest) => {
          if (latest.status !== 'PENDING') setRenewal(latest);
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [familySlug, paymentId]);

  const finished = renewal !== null && renewal.status !== 'PENDING';
  function close(): void {
    if (finished) router.refresh();
    onClose();
  }

  return (
    <SheetDialog
      title="Gia hạn gói dịch vụ"
      onClose={close}
      footer={
        <Button type="button" variant={finished ? 'default' : 'ghost'} onClick={close}>
          {finished ? 'Xong' : 'Đóng'}
        </Button>
      }
    >
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : !renewal ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-stone-500">
          <InlineLoader className="size-4" />
          Đang tạo mã thanh toán…
        </div>
      ) : renewal.status === 'PAID' ? (
        <div className="grid justify-items-center gap-3 py-6 text-center" role="status">
          <CheckCircle2 className="size-12 text-emerald-600" aria-hidden="true" />
          <p className="text-lg font-semibold text-stone-900">Gia hạn thành công</p>
          <p className="text-sm text-stone-600">
            Gói “{renewal.planName}” đã được gia hạn
            {renewal.extendedTo ? ` tới ngày ${formatDate(renewal.extendedTo)}` : ''}. Cảm ơn dòng
            họ đã tiếp tục đồng hành.
          </p>
        </div>
      ) : renewal.status === 'REVIEW' ? (
        <div className="grid justify-items-center gap-3 py-6 text-center" role="status">
          <TriangleAlert className="size-12 text-amber-600" aria-hidden="true" />
          <p className="text-lg font-semibold text-stone-900">Đã nhận chuyển khoản</p>
          <p className="text-sm text-stone-600">
            Khoản chuyển cần quản trị viên kiểm tra thêm trước khi gia hạn. Quản trị viên đã được
            báo và sẽ liên hệ với dòng họ sớm.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="rounded-xl border border-gold-500/30 bg-gold-50/70 px-4 py-3 text-sm">
            <p>
              Gia hạn gói <span className="font-semibold">“{renewal.planName}”</span> thêm{' '}
              {formatPlanDuration(renewal.durationMonths).toLowerCase()} với giá{' '}
              <span className="font-semibold text-brand-800">{formatMoney(renewal.amount)}</span>{' '}
              (giữ nguyên giá lúc đăng ký gói).
            </p>
            <p className="mt-1 text-stone-600">
              Hạn dùng mới sau khi thanh toán: {formatDate(renewal.previewExpiresAt)}
            </p>
          </div>
          <div className="grid items-center gap-4 sm:grid-cols-[13rem_minmax(0,1fr)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- QR is drawn by vietqr.app */}
            <img
              src={renewal.transfer.qrUrl}
              alt={`Mã QR chuyển ${formatMoney(renewal.amount)} với nội dung ${renewal.code}`}
              className="mx-auto w-52 rounded-xl border border-gold-500/30 bg-white p-2"
            />
            <dl className="divide-y divide-gold-500/20 text-sm">
              <CopyRow label="Ngân hàng" value={renewal.transfer.bank} />
              <CopyRow label="Số tài khoản" value={renewal.transfer.accountNumber} />
              {renewal.transfer.accountName ? (
                <CopyRow label="Chủ tài khoản" value={renewal.transfer.accountName} />
              ) : null}
              <CopyRow
                label="Số tiền"
                value={String(renewal.amount)}
                shown={formatMoney(renewal.amount)}
              />
              <CopyRow label="Nội dung chuyển khoản" value={renewal.transfer.content} />
            </dl>
          </div>
          <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Quét mã QR bằng ứng dụng ngân hàng, hoặc chuyển đúng số tiền với nội dung{' '}
            {renewal.transfer.content} để hệ thống tự gia hạn. Mã có hiệu lực tới{' '}
            {new Date(renewal.expiresAt).toLocaleString('vi-VN')}.
          </p>
          <p className="flex items-center justify-center gap-2 text-sm text-stone-500" role="status">
            <Hourglass className="size-4 animate-pulse" aria-hidden="true" />
            Đang chờ thanh toán… trang sẽ tự cập nhật khi nhận được tiền.
          </p>
        </div>
      )}
    </SheetDialog>
  );
}
