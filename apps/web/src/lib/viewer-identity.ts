type ViewerScope = {
  accountId: string;
  accountName: string | null;
};

let scope: ViewerScope = { accountId: 'guest', accountName: null };
const sessionDeviceKeys = new Map<string, string>();

export function setViewerScope(next: ViewerScope): void {
  scope = next;
}

const nameKey = (): string => `giapha:viewer-name:${scope.accountId}`;
const deviceKeyKey = (): string => `giapha:device-key:${scope.accountId}`;

export function isViewerNameFixed(): boolean {
  return scope.accountName !== null;
}

export function readViewerName(): string {
  if (scope.accountName !== null) return scope.accountName;
  try {
    return window.localStorage.getItem(nameKey()) ?? '';
  } catch {
    return '';
  }
}

export function saveViewerName(name: string): void {
  if (scope.accountName !== null) return;
  try {
    window.localStorage.setItem(nameKey(), name.trim());
  } catch {}
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
