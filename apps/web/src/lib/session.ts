import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ApiUnauthorizedError, getAuthProfile } from '@/lib/api';
import type { AuthProfile } from '@/lib/auth-api';
import { loginHref } from '@/lib/login-redirect';

/**
 * For server pages that need a signed-in visitor: with no session cookie, or
 * one the API no longer accepts (expired, signed out elsewhere), the visitor
 * goes to sign in and comes back to `path` afterwards.
 */
export async function requireSession(
  path: string,
): Promise<{ sessionToken: string; profile: AuthProfile }> {
  const sessionToken = (await cookies()).get('giapha_session')?.value;
  if (!sessionToken) redirect(loginHref(path, false));

  try {
    return { sessionToken, profile: await getAuthProfile(sessionToken) };
  } catch (error: unknown) {
    if (error instanceof ApiUnauthorizedError) redirect(loginHref(path, true));
    throw error;
  }
}
