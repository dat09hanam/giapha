import { apiFetch } from '@/lib/api-error';
import { CHANGE_PASSWORD_PATH } from '@/lib/login-redirect';

export type UserRole = 'ADMIN' | 'MEMBER_PLUS' | 'MEMBER';

export type AuthProfile = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  family: { id: string; slug: string; name: string } | null;
  /** A member account the clan head put in charge of at least one chi/nhánh. */
  managesBranches: boolean;
  /** The password was given by someone else and must be replaced before anything else. */
  mustChangePassword: boolean;
};

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

/** Mails a one-time code to the account's email; the answer never says whether it exists. */
export function requestPasswordReset(username: string): Promise<void> {
  return apiFetch<void>(
    `${API_URL}/auth/password-reset`,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    },
    'gửi mã xác nhận',
  );
}

/** Replaces a forgotten password with the mailed code; every device is signed out. */
export function confirmPasswordReset(input: {
  username: string;
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

  // Members and the clan head alike start on the family's home page; the clan head reaches
  // their admin pages from its navigation.
  return `/${encodeURIComponent(profile.family.slug)}`;
}
