import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ApiUnauthorizedError, getAuthProfile } from '@/lib/api';
import type { AuthProfile } from '@/lib/auth-api';
import { changePasswordHref, loginHref } from '@/lib/login-redirect';

export function requirePasswordChanged(profile: AuthProfile, path: string): void {
  if (profile.mustChangePassword) redirect(changePasswordHref(path));
}

export async function requireSession(
  path: string,
): Promise<{ sessionToken: string; profile: AuthProfile }> {
  const sessionToken = (await cookies()).get('giapha_session')?.value;
  if (!sessionToken) redirect(loginHref(path, false));

  let profile: AuthProfile;
  try {
    profile = await getAuthProfile(sessionToken);
  } catch (error: unknown) {
    if (error instanceof ApiUnauthorizedError) redirect(loginHref(path, true));
    throw error;
  }
  requirePasswordChanged(profile, path);
  return { sessionToken, profile };
}
