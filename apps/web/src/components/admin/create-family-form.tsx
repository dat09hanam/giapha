'use client';

import { Check, CheckCircle2, Copy, KeyRound, Plus, TriangleAlert, UsersRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { InlineLoader } from '@/components/ui/heritage-loader';
import { Button } from '@/components/ui/button';
import { DeathAnniversaryPicker } from '@/components/ui/death-anniversary-picker';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  checkFamilySlug,
  createFamily,
  type CreatedFamilyResult,
  type FamilySlugCheck,
} from '@/lib/family-api';
import { foldVietnamese } from '@/lib/person-search';
import { cn } from '@/lib/utils';
import { SectionCard } from '@/components/admin/admin-layout';
import { Field } from '@/components/auth/form-fields';
import { useToast } from '@/components/ui/toast';

function previewSlug(name: string, deathAnniversary: string): string {
  const base = foldVietnamese(name)
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '');
  return `${base || 'ten-dong-ho'}-${deathAnniversary.replace('/', '-') || 'dd-mm'}`;
}

type SlugStatus = 'empty' | 'checking' | 'free' | 'taken' | 'unknown';

const SLUG_CHECK_DELAY_MS = 350;

function slugStatusMessage(
  status: SlugStatus,
  check: FamilySlugCheck | null,
  hasOrigin: boolean,
): string {
  switch (status) {
    case 'empty':
      return 'Tạo tự động từ tên dòng họ và ngày giỗ.';
    case 'checking':
      return 'Đang kiểm tra đường dẫn…';
    case 'unknown':
      return 'Chưa kiểm tra được đường dẫn; hệ thống sẽ kiểm tra lại khi tạo.';
    case 'free':
      return check?.withOrigin
        ? 'Đã có dòng họ cùng tên và ngày giỗ, nên quê quán được thêm vào. Đường dẫn dùng được.'
        : 'Đường dẫn dùng được.';
    case 'taken':
      return hasOrigin
        ? 'Đường dẫn có quê quán này cũng đã được dùng. Hãy ghi quê quán cụ thể hơn (phần trước dấu phẩy đầu tiên).'
        : 'Đã có dòng họ cùng tên và ngày giỗ. Hãy nhập quê quán để phân biệt.';
  }
}

export function CreateFamilyForm() {
  const [name, setName] = useState('');
  const [deathAnniversary, setDeathAnniversary] = useState('');
  const [ancestryOrigin, setAncestryOrigin] = useState('');
  const [headEmail, setHeadEmail] = useState('');
  const [slugCheck, setSlugCheck] = useState<{
    key: string;
    result: FamilySlugCheck | null;
  } | null>(null);
  const showToast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedFamilyResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const checkKey =
    name.trim().length >= 2 && deathAnniversary
      ? JSON.stringify([name.trim(), deathAnniversary, ancestryOrigin.trim()])
      : null;

  useEffect(() => {
    if (!checkKey) return;
    const [checkName, checkAnniversary, checkOrigin] = JSON.parse(checkKey) as [
      string,
      string,
      string,
    ];
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      checkFamilySlug(
        { name: checkName, deathAnniversary: checkAnniversary, ancestryOrigin: checkOrigin },
        controller.signal,
      )
        .then((result) => setSlugCheck({ key: checkKey, result }))
        .catch(() => {
          if (!controller.signal.aborted) setSlugCheck({ key: checkKey, result: null });
        });
    }, SLUG_CHECK_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [checkKey]);

  const checked = checkKey && slugCheck?.key === checkKey ? slugCheck.result : undefined;
  const slugStatus: SlugStatus = !checkKey
    ? 'empty'
    : checked === undefined
      ? 'checking'
      : checked === null
        ? 'unknown'
        : checked.available
          ? 'free'
          : 'taken';
  const shownSlug = checked?.slug ?? previewSlug(name, deathAnniversary);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setCreated(null);

    try {
      const body = await createFamily({
        name,
        deathAnniversary,
        ancestryOrigin,
        headEmail: headEmail.trim(),
      });
      setCreated(body);
      setName('');
      setDeathAnniversary('');
      setAncestryOrigin('');
      setHeadEmail('');
      showToast({
        kind: 'success',
        message: `Đã tạo dòng họ ${body.family.name}.`,
      });
    } catch (submissionError: unknown) {
      showToast({
        kind: 'error',
        message: getApiErrorMessage(submissionError, 'tạo dòng họ'),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCredential(label: string, username: string, password: string): Promise<void> {
    await navigator.clipboard.writeText(`Tên đăng nhập: ${username}\nMật khẩu: ${password}`);
    setCopied(label);
  }

  return (
    <SectionCard
      icon={<Plus aria-hidden="true" />}
      title="Tạo gia phả mới"
      description="Mỗi dòng họ có một đường dẫn riêng."
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <form className="grid content-start gap-5" onSubmit={handleSubmit}>
          <Field
            id="family-name"
            name="name"
            label="Tên dòng họ"
            placeholder="Họ Nguyễn"
            minLength={2}
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <DeathAnniversaryPicker
            id="death-anniversary"
            value={deathAnniversary}
            onChange={setDeathAnniversary}
            required
          />
          <Field
            id="family-ancestry-origin"
            name="ancestryOrigin"
            label="Quê quán, nguồn gốc"
            placeholder="Thanh Lộc, Can Lộc, Hà Tĩnh"
            maxLength={255}
            value={ancestryOrigin}
            onChange={(event) => setAncestryOrigin(event.target.value)}
          />
          <Field
            id="family-head-email"
            name="headEmail"
            type="email"
            label="Email Trưởng họ"
            placeholder="truongho@gmail.com"
            maxLength={191}
            autoComplete="off"
            value={headEmail}
            onChange={(event) => setHeadEmail(event.target.value)}
            required
          />
          <div className="grid gap-1.5">
            <Field
              id="family-slug"
              label="Đường dẫn"
              value={`/${shownSlug}`}
              readOnly
              tabIndex={-1}
              aria-describedby="family-slug-status"
              aria-invalid={slugStatus === 'taken'}
              className={cn(
                'cursor-default bg-gold-50/70 text-stone-600 focus:ring-0',
                slugStatus === 'free' && 'border-2 border-emerald-600!',
                slugStatus === 'taken' && 'border-2 border-red-600!',
              )}
            />
            <span
              id="family-slug-status"
              aria-live="polite"
              className={cn(
                'break-all text-xs',
                slugStatus === 'free' && 'text-emerald-700',
                slugStatus === 'taken' && 'font-medium text-red-700',
                (slugStatus === 'empty' || slugStatus === 'checking' || slugStatus === 'unknown') &&
                  'text-stone-500',
              )}
            >
              {slugStatusMessage(slugStatus, checked ?? null, ancestryOrigin.trim() !== '')}
            </span>
          </div>
          <Button
            type="submit"
            size="lg"
            className="mt-1 sm:justify-self-start"
            disabled={submitting || slugStatus === 'taken'}
          >
            {submitting ? (
              <InlineLoader className="size-4" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            {submitting ? 'Đang tạo…' : 'Tạo gia phả và tài khoản'}
          </Button>
        </form>

        {created ? (
          <div
            className="grid content-start gap-4 rounded-2xl border border-brand-200 bg-brand-50/70 p-5"
            role="status"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
              <div>
                <p className="font-semibold text-brand-950">Đã tạo {created.family.name}</p>
                <p className="text-sm text-brand-800">
                  Đường dẫn /{created.family.slug} · Ngày giỗ {created.family.deathAnniversary}
                </p>
              </div>
            </div>
            {(
              [
                ['Trưởng họ', created.accounts.memberPlus],
                ['Thành viên', created.accounts.member],
              ] as const
            ).map(([label, account]) => (
              <div key={label} className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-brand-950">{label}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copyCredential(label, account.username, account.password)}
                  >
                    {copied === label ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Copy className="size-3.5" aria-hidden="true" />
                    )}
                    {copied === label ? 'Đã sao chép' : 'Sao chép'}
                  </Button>
                </div>
                <dl className="mt-3 grid gap-1.5 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-stone-500">Tên đăng nhập</dt>
                    <dd className="break-all font-mono font-medium">{account.username}</dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-stone-500">Mật khẩu</dt>
                    <dd className="break-all font-mono font-medium">{account.password}</dd>
                  </div>
                </dl>
              </div>
            ))}
            <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Mật khẩu chỉ hiển thị một lần tại đây. Hãy lưu và gửi riêng cho đúng người dùng.
            </p>
          </div>
        ) : (
          <div className="grid content-start gap-4 rounded-2xl border border-dashed border-brand-900/20 bg-stone-50/60 p-5">
            <p className="font-medium text-brand-950">Sau khi tạo, hệ thống sẽ cấp</p>
            <ul className="grid gap-3 text-sm leading-6 text-stone-600">
              <li className="flex gap-3">
                <KeyRound className="mt-1 size-4 shrink-0 text-brand-700" aria-hidden="true" />
                <span>
                  <strong className="font-medium text-brand-950">Tài khoản Trưởng họ</strong> để
                  quản lý thông tin, thành viên và trang trí phả đồ. Mật khẩu do hệ thống tự sinh và
                  phải được đổi ở lần đăng nhập đầu tiên.
                </span>
              </li>
              <li className="flex gap-3">
                <UsersRound className="mt-1 size-4 shrink-0 text-brand-700" aria-hidden="true" />
                <span>
                  <strong className="font-medium text-brand-950">Tài khoản Thành viên</strong> để
                  con cháu xem cây gia phả.
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
