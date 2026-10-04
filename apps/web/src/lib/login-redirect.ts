/**
 * The sign-in page, returning to `next` afterwards. `expired` adds the notice
 * that the session ran out, for visitors who were signed in a moment ago.
 */
export function loginHref(next: string, expired: boolean): string {
  const query = new URLSearchParams({ next });
  if (expired) query.set('reason', 'session-expired');
  return `/login?${query.toString()}`;
}

let redirecting = false;

/**
 * Sends the browser to sign in again after the API refused the session, and
 * comes back to this page afterwards. Called once however many requests fail
 * together. Does nothing on the sign-in page itself.
 */
export function redirectToLoginFromBrowser(): boolean {
  if (typeof window === 'undefined' || redirecting) return redirecting;
  const { pathname, search } = window.location;
  if (pathname.startsWith('/login')) return false;
  redirecting = true;
  window.location.assign(loginHref(pathname + search, true));
  return true;
}
