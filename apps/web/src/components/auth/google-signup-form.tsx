'use client';

import { ArrowRight, CheckCircle2, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { DeathAnniversaryPicker } from '@/components/ui/death-anniversary-picker';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  GOOGLE_CLIENT_ID,
  loginWithGoogle,
  profileDestination,
  signUpWithGoogle,
  type GoogleSignupResult,
} from '@/lib/auth-api';
import { takePendingGoogleSignup, type PendingGoogleSignup } from '@/lib/google-signup';
import { SITE_POLICY_LINKS } from '@/lib/site-contact';

import { Field } from './form-fields';
import { GoogleSignInButton } from './google-sign-in-button';

const linkClass = 'font-medium text-brand-800 underline underline-offset-4';

/**
 * A Google account whose email differs from the one the admin stored is not recognised, so a
 * family that already has a tree would end up with a second one.
 */
function ExistingFamilyNotice() {
  return (
    <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
      Dòng họ của bạn <strong>đã có gia phả</strong>? Đừng đăng ký mới. Hãy nhờ quản trị viên cập
      nhật email Trưởng họ đúng với tài khoản Google này, rồi{' '}
      <Link href="/login" className={linkClass}>
        đăng nhập bằng Google
      </Link>
      .
    </p>
  );
}

/** Self-service sign-up: a Google account opens a family as its clan head. */
export function GoogleSignupForm() {
  const router = useRouter();
  const showToast = useToast();
  const [google, setGoogle] = useState<PendingGoogleSignup | null>(null);
  const [created, setCreated] = useState<GoogleSignupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [deathAnniversary, setDeathAnniversary] = useState('');
  const [ancestryOrigin, setAncestryOrigin] = useState('');
  const [agreed, setAgreed] = useState(false);

  // A Google sign-in started on the login page goes straight to the family details.
  useEffect(() => {
    const pending = takePendingGoogleSignup();
    if (pending) setGoogle(pending);
  }, []);

  async function handleGoogle(credential: string): Promise<void> {
    setBusy(true);
    try {
      const result = await loginWithGoogle(credential);
      if (result.status === 'signed-in') {
        showToast({
          kind: 'success',
          message: 'Tài khoản Google này đã có gia phả. Đã đăng nhập.',
        });
        router.replace(profileDestination(result.profile));
        router.refresh();
        return;
      }
      setGoogle({ credential, email: result.email, name: result.name });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'đăng nhập bằng Google') });
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!google) return;
    if (!deathAnniversary) {
      showToast({ kind: 'error', message: 'Hãy chọn ngày giỗ họ.' });
      return;
    }
    setBusy(true);
    try {
      setCreated(
        await signUpWithGoogle({
          credential: google.credential,
          name: name.trim(),
          deathAnniversary,
          ancestryOrigin: ancestryOrigin.trim() || undefined,
          agreed,
        }),
      );
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'đăng ký dòng họ') });
    } finally {
      setBusy(false);
    }
  }

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="rounded-xl border border-gold-500/30 bg-gold-50 px-4 py-3 text-sm leading-6 text-stone-700">
        Đăng ký trực tuyến đang tạm đóng. Vui lòng liên hệ quản trị viên để được tạo gia phả.
      </p>
    );
  }

  if (created) {
    return (
      <div className="grid gap-4">
        <p className="flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>
            Đã tạo gia phả <strong>{created.profile.family?.name}</strong>. Bạn là Trưởng họ và đăng
            nhập bằng tài khoản Google này.
          </span>
        </p>
        <div className="grid gap-1 rounded-xl border border-gold-500/30 bg-white/70 px-4 py-3 text-sm">
          <p className="font-medium text-brand-950">Tài khoản chung cho Thành viên</p>
          <p className="text-xs leading-5 text-stone-500">
            Gửi cho người trong họ để họ đăng nhập xem gia phả. Hãy lưu lại, mật khẩu chỉ hiện một
            lần.
          </p>
          <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
            <dt className="text-stone-500">Tên đăng nhập</dt>
            <dd className="break-all font-semibold text-stone-900">{created.member.username}</dd>
            <dt className="text-stone-500">Mật khẩu</dt>
            <dd className="break-all font-semibold text-stone-900">{created.member.password}</dd>
          </dl>
        </div>
        <Button
          type="button"
          size="lg"
          onClick={() => {
            router.replace(profileDestination(created.profile));
            router.refresh();
          }}
        >
          Vào gia phả
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  if (!google) {
    return (
      <div className="grid gap-4">
        <GoogleSignInButton
          text="signup_with"
          disabled={busy}
          onCredential={(credential) => void handleGoogle(credential)}
        />
        <p className="text-center text-sm text-stone-600">
          Đã có tài khoản?{' '}
          <Link href="/login" className={linkClass}>
            Đăng nhập
          </Link>
        </p>
        <ExistingFamilyNotice />
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <p className="rounded-xl border border-gold-500/30 bg-white/70 px-4 py-3 text-sm leading-6 text-stone-700">
        Đăng ký bằng <strong className="break-all text-stone-900">{google.email}</strong>.{' '}
        <button type="button" className={linkClass} onClick={() => setGoogle(null)} disabled={busy}>
          Đổi tài khoản
        </button>
      </p>
      <ExistingFamilyNotice />
      <Field
        id="signup-family-name"
        name="name"
        label="Tên dòng họ"
        icon={<Users />}
        placeholder="Họ Nguyễn"
        minLength={2}
        maxLength={100}
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <DeathAnniversaryPicker
        id="signup-death-anniversary"
        value={deathAnniversary}
        onChange={setDeathAnniversary}
        required
      />
      <Field
        id="signup-ancestry-origin"
        name="ancestryOrigin"
        label="Quê quán, nguồn gốc (không bắt buộc)"
        icon={<MapPin />}
        placeholder="Thanh Lộc, Can Lộc, Hà Tĩnh"
        maxLength={255}
        value={ancestryOrigin}
        onChange={(event) => setAncestryOrigin(event.target.value)}
      />
      <label className="flex items-start gap-2 text-sm leading-6 text-stone-700">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-brand-700"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          required
        />
        <span>
          Tôi đồng ý với{' '}
          <a href={SITE_POLICY_LINKS.terms} target="_blank" rel="noopener" className={linkClass}>
            quy định sử dụng
          </a>{' '}
          và{' '}
          <a href={SITE_POLICY_LINKS.privacy} target="_blank" rel="noopener" className={linkClass}>
            chính sách bảo mật
          </a>
          .
        </span>
      </label>
      <Button type="submit" size="lg" className="mt-1" disabled={busy}>
        {busy ? (
          <>
            <InlineLoader className="size-4" />
            Đang tạo gia phả…
          </>
        ) : (
          <>
            Tạo gia phả miễn phí
            <ArrowRight className="size-4" aria-hidden="true" />
          </>
        )}
      </Button>
    </form>
  );
}
