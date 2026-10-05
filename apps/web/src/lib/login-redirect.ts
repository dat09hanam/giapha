/**
 * The sign-in page, returning to `next` afterwards. `expired` adds the notice
 * that the session ran out, for visitors who were signed in a moment ago.
 */
export function loginHref(next: string, expired: boolean): string {
  const query = new URLSearchParams({ next });
  if (expired) query.set('reason', 'session-expired');
  return `/login?${query.toString()}`;
}

/** Where an account that must replace its given password is sent, from every page. */
export const CHANGE_PASSWORD_PATH = '/doi-mat-khau';

/** The API's 403 message for every request from such an account but changing the password. */
export const PASSWORD_CHANGE_REQUIRED_MESSAGE =
  'Bạn cần đổi mật khẩu được cấp trước khi tiếp tục sử dụng.';

/** The change-password page, returning to `next` afterwards. */
export function changePasswordHref(next: string): string {
  return `${CHANGE_PASSWORD_PATH}?${new URLSearchParams({ next }).toString()}`;
}

let redirecting = false;

/**
 * Sends the browser to change its given password after the API refused a request for it, and
 * comes back to this page afterwards. Does nothing on the change-password page itself.
 */
export function redirectToChangePasswordFromBrowser(): boolean {
  if (typeof window === 'undefined' || redirecting) return redirecting;
  const { pathname, search } = window.location;
  if (pathname.startsWith(CHANGE_PASSWORD_PATH)) return false;
  redirecting = true;
  window.location.assign(changePasswordHref(pathname + search));
  return true;
}

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
