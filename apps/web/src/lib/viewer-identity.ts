/**
 * Who is using this phone, per signed-in account. Members share one family
 * account, so each device remembers the name its owner typed and keeps a
 * random key the API uses to recognise the posts, comments and reactions it
 * made. Both are stored per account: signing out of the clan head's account
 * and into the members' one on the same phone starts with neither the head's
 * name nor the right to edit the head's posts.
 *
 * The scope is set by <ViewerIdentityScope> around the family pages, before
 * anything below it renders. Values live in localStorage; if storage is
 * blocked the key lasts for the visit.
 */

type ViewerScope = {
  /** The signed-in account's id, or "guest". */
  accountId: string;
  /** The name to start from before anything is typed: a personal account's own name. */
  defaultName: string;
};

let scope: ViewerScope = { accountId: 'guest', defaultName: '' };
const sessionDeviceKeys = new Map<string, string>();

export function setViewerScope(next: ViewerScope): void {
  scope = next;
}

const nameKey = (): string => `giapha:viewer-name:${scope.accountId}`;
const deviceKeyKey = (): string => `giapha:device-key:${scope.accountId}`;

export function readViewerName(): string {
  try {
    return window.localStorage.getItem(nameKey()) || scope.defaultName;
  } catch {
    return scope.defaultName;
  }
}

export function saveViewerName(name: string): void {
  try {
    window.localStorage.setItem(nameKey(), name.trim());
  } catch {
    // Blocked storage: the name is simply asked for again next time.
  }
}

function randomKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function getDeviceKey(): string {
  try {
    const stored = window.localStorage.getItem(deviceKeyKey());
    if (stored && /^[0-9a-f]{32,128}$/.test(stored)) return stored;
    const created = randomKey();
    window.localStorage.setItem(deviceKeyKey(), created);
    return created;
  } catch {
    const existing = sessionDeviceKeys.get(scope.accountId);
    if (existing) return existing;
    const created = randomKey();
    sessionDeviceKeys.set(scope.accountId, created);
    return created;
  }
}
