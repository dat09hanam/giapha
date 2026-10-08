import { apiFetch } from '@/lib/api-error';

export type FamilyAccountBranch = { rootPersonId: string; rootName: string };

export type FamilyAccount = {
  id: string;
  username: string;
  displayName: string;
  /** Signs the account in and receives its Quên mật khẩu code; the shared account has none. */
  email: string | null;
  role: 'MEMBER_PLUS' | 'MEMBER';
  status: 'ACTIVE' | 'SUSPENDED';
  /** The family's shared member account; a reset gives it a new shared password. */
  isShared: boolean;
  createdAt: string;
  branches: FamilyAccountBranch[];
};

/** The password is returned only by the request that set it. */
export type FamilyAccountWithPassword = { account: FamilyAccount; password: string };

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

function accountsUrl(slug: string, suffix = ''): string {
  return `${API_URL}/families/${encodeURIComponent(slug)}/accounts${suffix}`;
}

function send<T>(url: string, method: string, body: unknown, action: string): Promise<T> {
  return apiFetch<T>(
    url,
    {
      method,
      credentials: 'include',
      // Fastify rejects a JSON content type with an empty body, so DELETE sends neither.
      ...(body === undefined
        ? { headers: { Accept: 'application/json' } }
        : {
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
    },
    action,
  );
}

/**
 * The full username for a typed prefix (the API appends the family's suffix) and whether it is
 * still free; usernames are unique across every family.
 */
export function checkUsernameAvailable(
  slug: string,
  usernamePrefix: string,
  signal: AbortSignal,
): Promise<{ username: string; available: boolean }> {
  const query = new URLSearchParams({ usernamePrefix });
  return apiFetch<{ username: string; available: boolean }>(
    accountsUrl(slug, `/username-check?${query.toString()}`),
    { credentials: 'include', headers: { Accept: 'application/json' }, signal },
    'kiểm tra tên đăng nhập',
  );
}

export function createFamilyAccount(
  slug: string,
  /** `usernamePrefix` is what the clan head typed; the API appends the family's suffix. */
  input: { usernamePrefix: string; displayName: string; email?: string },
): Promise<FamilyAccountWithPassword> {
  return send(accountsUrl(slug), 'POST', input, 'tạo tài khoản');
}

export function updateFamilyAccount(
  slug: string,
  userId: string,
  /** `email: ''` removes the account's email. */
  input: { displayName?: string; status?: FamilyAccount['status']; email?: string },
): Promise<FamilyAccount> {
  return send(accountsUrl(slug, `/${userId}`), 'PATCH', input, 'cập nhật tài khoản');
}

/** A generated password the account's owner must replace on their next sign-in. */
export function resetFamilyAccountPassword(
  slug: string,
  userId: string,
): Promise<FamilyAccountWithPassword> {
  return send(accountsUrl(slug, `/${userId}/password`), 'POST', undefined, 'đặt lại mật khẩu');
}

export function setFamilyAccountBranches(
  slug: string,
  userId: string,
  rootPersonIds: string[],
): Promise<FamilyAccount> {
  return send(accountsUrl(slug, `/${userId}/branches`), 'PUT', { rootPersonIds }, 'giao chi/nhánh');
}

export function deleteFamilyAccount(slug: string, userId: string): Promise<void> {
  return send(accountsUrl(slug, `/${userId}`), 'DELETE', undefined, 'xóa tài khoản');
}
