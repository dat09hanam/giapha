import type { AuthProfile } from '@/lib/auth-api';

/**
 * The page the visitor was on before being sent to sign in or change their password (`?next=`),
 * when it is a path on this site that the signed-in account may open: its own family's pages,
 * or /admin for the platform admin. Anything else, including links to other sites, is null.
 */
export function safeReturnPath(profile: AuthProfile, next: string | null): string | null {
  // "//host" and "/\host" both leave the site in a browser.
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
