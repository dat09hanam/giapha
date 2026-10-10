export function loginHref(next: string, expired: boolean): string {
  const query = new URLSearchParams({ next });
  if (expired) query.set('reason', 'session-expired');
  return `/login?${query.toString()}`;
}

export const CHANGE_PASSWORD_PATH = '/doi-mat-khau';

export const PASSWORD_CHANGE_REQUIRED_MESSAGE =
  'Bạn cần đổi mật khẩu được cấp trước khi tiếp tục sử dụng.';

export function changePasswordHref(next: string): string {
  return `${CHANGE_PASSWORD_PATH}?${new URLSearchParams({ next }).toString()}`;
}

let redirecting = false;

export function redirectToChangePasswordFromBrowser(): boolean {
  if (typeof window === 'undefined' || redirecting) return redirecting;
  const { pathname, search } = window.location;
  if (pathname.startsWith(CHANGE_PASSWORD_PATH)) return false;
  redirecting = true;
  window.location.assign(changePasswordHref(pathname + search));
  return true;
}

export function redirectToLoginFromBrowser(): boolean {
  if (typeof window === 'undefined' || redirecting) return redirecting;
  const { pathname, search } = window.location;
  if (pathname.startsWith('/login')) return false;
  redirecting = true;
  window.location.assign(loginHref(pathname + search, true));
  return true;
}
