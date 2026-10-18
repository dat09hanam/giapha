'use client';

import { useEffect, useRef, useState } from 'react';

import { GOOGLE_CLIENT_ID } from '@/lib/auth-api';

type GoogleCredentialResponse = { credential?: string };

type GoogleIdentityApi = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with';
      shape?: 'rectangular' | 'pill';
      width?: number;
      locale?: string;
    },
  ) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentityApi } };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
/** Google's button accepts widths up to 400px. */
const MAX_BUTTON_WIDTH = 400;

let scriptLoad: Promise<GoogleIdentityApi> | null = null;

function loadGoogleIdentity(): Promise<GoogleIdentityApi> {
  scriptLoad ??= new Promise<GoogleIdentityApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () =>
      window.google ? resolve(window.google.accounts.id) : reject(new Error('no google'));
    script.onerror = () => {
      scriptLoad = null;
      reject(new Error('Google script failed'));
    };
    document.head.appendChild(script);
  });
  return scriptLoad;
}

/**
 * Google's own sign-in button. `onCredential` receives the ID token the API verifies. Renders
 * nothing when no Google client is configured.
 */
export function GoogleSignInButton({
  text,
  onCredential,
  disabled = false,
}: {
  text: 'signin_with' | 'signup_with' | 'continue_with';
  onCredential: (credential: string) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const container = containerRef.current;
    if (!GOOGLE_CLIENT_ID || !container) return;
    let cancelled = false;
    loadGoogleIdentity()
      .then((google) => {
        if (cancelled) return;
        google.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: 'popup',
          callback: (response) => {
            if (response.credential) callbackRef.current(response.credential);
          },
        });
        google.renderButton(container, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          locale: 'vi',
          width: Math.min(MAX_BUTTON_WIDTH, Math.round(container.clientWidth)),
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!GOOGLE_CLIENT_ID) return null;
  if (failed) {
    return (
      <p className="text-center text-sm text-stone-500">
        Không tải được nút đăng nhập Google. Hãy kiểm tra kết nối mạng và tải lại trang.
      </p>
    );
  }
  return (
    <div
      ref={containerRef}
      className="flex min-h-11 w-full justify-center data-[disabled]:pointer-events-none data-[disabled]:opacity-60"
      data-disabled={disabled || undefined}
      aria-busy={disabled || undefined}
    />
  );
}
