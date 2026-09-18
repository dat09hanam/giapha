import { apiFetch } from '@/lib/api-error';

export type UserRole = 'ADMIN' | 'MEMBER_PLUS' | 'MEMBER';

export type AuthProfile = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  family: { id: string; slug: string; name: string } | null;
};

type LoginInput = { username: string; password: string };

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

export function profileDestination(profile: AuthProfile): string {
  if (profile.role === 'ADMIN') {
    return '/admin';
  }

  if (!profile.family) {
    return '/';
  }

  const familySlug = encodeURIComponent(profile.family.slug);
  return profile.role === 'MEMBER_PLUS' ? `/admin/${familySlug}` : `/${familySlug}`;
}
