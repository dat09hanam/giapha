'use client';

import { CheckCircle2, Link2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { SectionCard } from '@/components/admin/admin-layout';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { GOOGLE_CLIENT_ID, linkGoogleAccount } from '@/lib/auth-api';

/**
 * The clan head links their account to Google, or moves it to another Google account. Each time
 * the person signs in to Google in its own window, so only an account they own can be linked.
 */
export function GoogleAccountCard({
  initialEmail,
  initialLinked,
}: {
  initialEmail: string | null;
  initialLinked: boolean;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [email, setEmail] = useState(initialEmail);
  const [linked, setLinked] = useState(initialLinked);
  const [busy, setBusy] = useState(false);

  async function link(credential: string): Promise<void> {
    setBusy(true);
    try {
      const profile = await linkGoogleAccount(credential);
      const changed = linked;
      setEmail(profile.email);
      setLinked(profile.googleLinked);
      showToast({
        kind: 'success',
        message: changed
          ? `Đã đổi sang tài khoản Google ${profile.email ?? ''}.`
          : `Đã liên kết tài khoản Google ${profile.email ?? ''}.`,
      });
      router.refresh();
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'liên kết tài khoản Google') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard
      icon={<Link2 aria-hidden="true" />}
      title="Tài khoản Google"
      description="Liên kết để đăng nhập tài khoản Trưởng họ bằng Google, không cần nhớ mật khẩu. Email của tài khoản Google sẽ thành email Trưởng họ, dùng cả khi quên mật khẩu."
    >
      <div className="grid gap-4 sm:max-w-md">
        {linked ? (
          <p className="flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>
              Đang liên kết với <strong className="break-all">{email ?? 'tài khoản Google'}</strong>
              .
            </span>
          </p>
        ) : (
          <p className="rounded-xl border border-gold-500/30 bg-white/70 px-4 py-3 text-sm leading-6 text-stone-700">
            Chưa liên kết tài khoản Google.
            {email ? (
              <>
                {' '}
                Email hiện tại: <strong className="break-all text-stone-900">{email}</strong>.
              </>
            ) : null}
          </p>
        )}

        {GOOGLE_CLIENT_ID ? (
          <div className="grid gap-2">
            <p className="text-sm font-medium text-brand-950">
              {linked ? 'Đổi sang tài khoản Google khác' : 'Liên kết tài khoản Google'}
            </p>
            <GoogleSignInButton
              text="continue_with"
              disabled={busy}
              onCredential={(credential) => void link(credential)}
            />
            {busy ? (
              <p className="flex items-center gap-2 text-xs text-stone-500">
                <InlineLoader className="size-3.5" />
                Đang xác minh với Google…
              </p>
            ) : (
              <p className="text-xs leading-5 text-stone-500">
                Google sẽ mở cửa sổ để bạn đăng nhập và xác nhận tài khoản muốn dùng.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-stone-500">
            Đăng nhập bằng Google chưa được bật trên hệ thống.
          </p>
        )}
      </div>
    </SectionCard>
  );
}
