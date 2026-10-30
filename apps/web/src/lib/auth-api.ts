import { apiFetch } from '@/lib/api-error';
import { CHANGE_PASSWORD_PATH } from '@/lib/login-redirect';

export type UserRole = 'ADMIN' | 'MEMBER_PLUS' | 'MEMBER';

export type AuthProfile = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  /** Whether a Google account signs in to this account. */
  googleLinked: boolean;
  /** A shared family login: it cannot be linked to Google. */
  isShared: boolean;
  role: UserRole;
  family: { id: string; slug: string; name: string } | null;
  managesBranches: boolean;
  mustChangePassword: boolean;
};

export function isClanHeadOf(profile: AuthProfile, slug: string): boolean {
  return profile.role === 'MEMBER_PLUS' && profile.family?.slug === slug;
}

type LoginInput = { username: string; password: string };

export { CHANGE_PASSWORD_PATH };

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export function login(input: LoginInput): Promise<AuthProfile> {
  return apiFetch<AuthProfile>(
    `${API_URL}/auth/login`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'đăng nhập',
  );
}

export function logout(): Promise<void> {
  return apiFetch<void>(
    `${API_URL}/auth/logout`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    },
    'đăng xuất',
  );
}

export function getCurrentProfile(): Promise<AuthProfile> {
  return apiFetch<AuthProfile>(
    `${API_URL}/auth/me`,
    {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    },
    'tải thông tin tài khoản',
  );
}

export function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<AuthProfile> {
  return apiFetch<AuthProfile>(
    `${API_URL}/auth/password`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'đổi mật khẩu',
  );
}

export const FORGOT_PASSWORD_PATH = '/quen-mat-khau';

export function requestPasswordReset(login: string): Promise<{ sentTo: string }> {
  return apiFetch<{ sentTo: string }>(
    `${API_URL}/auth/password-reset`,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ login }),
    },
    'gửi mã xác nhận',
  );
}

export function verifyPasswordReset(input: { login: string; code: string }): Promise<void> {
  return apiFetch<void>(
    `${API_URL}/auth/password-reset/verify`,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'kiểm tra mã xác nhận',
  );
}

export function confirmPasswordReset(input: {
  login: string;
  code: string;
  newPassword: string;
}): Promise<void> {
  return apiFetch<void>(
    `${API_URL}/auth/password-reset/confirm`,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'đặt lại mật khẩu',
  );
}

export function profileDestination(profile: AuthProfile): string {
  if (profile.mustChangePassword) {
    return CHANGE_PASSWORD_PATH;
  }

  if (profile.role === 'ADMIN') {
    return '/admin';
  }

  if (!profile.family) {
    return '/';
  }

  // The clan head signs in to manage the family, so they land on its management page.
  if (profile.role === 'MEMBER_PLUS') {
    return `/admin/${encodeURIComponent(profile.family.slug)}`;
  }

  return `/${encodeURIComponent(profile.family.slug)}`;
}

/** Set when the Google sign-in button can be shown (same OAuth client as the API). */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export const GOOGLE_SIGNUP_PATH = '/dang-ky';

export type GoogleLoginResult =
  | { status: 'signed-in'; profile: AuthProfile }
  | { status: 'needs-registration'; email: string; name: string | null };

export function loginWithGoogle(credential: string): Promise<GoogleLoginResult> {
  return apiFetch<GoogleLoginResult>(
    `${API_URL}/auth/google`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    },
    'đăng nhập bằng Google',
  );
}

/** Links the signed-in account to the Google account that just verified in the browser. */
export function linkGoogleAccount(credential: string): Promise<AuthProfile> {
  return apiFetch<AuthProfile>(
    `${API_URL}/auth/google/link`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    },
    'liên kết tài khoản Google',
  );
}

export type GoogleSignupInput = {
  credential: string;
  name: string;
  deathAnniversary: string;
  ancestryOrigin?: string;
  headPhone: string;
  ambassadorCode?: string;
  agreed: boolean;
};

export type GoogleSignupResult = {
  profile: AuthProfile;
  /** The family's shared member account, shown once. */
  member: { username: string; password: string };
};

export function signUpWithGoogle(input: GoogleSignupInput): Promise<GoogleSignupResult> {
  return apiFetch<GoogleSignupResult>(
    `${API_URL}/auth/google/register`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'đăng ký dòng họ',
  );
}
