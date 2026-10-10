import type { AuthProfile } from '@/lib/auth-api';

export function safeReturnPath(profile: AuthProfile, next: string | null): string | null {
  if (!next || !/^\/(?![/\\])/.test(next) || next.startsWith('/login')) return null;
  const [, first = '', second = ''] = next.split(/[/?#]/);
  if (profile.role === 'ADMIN') return first === 'admin' ? next : null;
  const slug = profile.family?.slug;
  if (!slug) return null;
  try {
    const ownFamily =
      decodeURIComponent(first) === slug ||
      (first === 'admin' && decodeURIComponent(second) === slug);
    return ownFamily ? next : null;
  } catch {
    return null;
  }
}
