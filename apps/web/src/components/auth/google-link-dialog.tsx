'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { SheetDialog } from '@/components/ui/sheet-dialog';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { linkGoogleAccount } from '@/lib/auth-api';

/** Links the signed-in clan head or branch manager to the Google account they sign in with. */
export function GoogleLinkDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const showToast = useToast();
  const [busy, setBusy] = useState(false);

  async function link(credential: string): Promise<void> {
    setBusy(true);
    try {
      const profile = await linkGoogleAccount(credential);
      showToast({
        kind: 'success',
        message: `Đã liên kết tài khoản Google ${profile.email ?? ''}.`,
      });
      onClose();
      router.refresh();
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'liên kết tài khoản Google') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SheetDialog title="Liên kết tài khoản Google" onClose={onClose} busy={busy} size="sm">
      <div className="grid gap-3">
        <GoogleSignInButton
          text="continue_with"
          disabled={busy}
          onCredential={(credential) => void link(credential)}
        />
        {busy ? (
          <p className="flex items-center justify-center gap-2 text-xs text-stone-500">
            <InlineLoader className="size-3.5" />
            Đang xác minh với Google…
          </p>
        ) : null}
      </div>
    </SheetDialog>
  );
}
