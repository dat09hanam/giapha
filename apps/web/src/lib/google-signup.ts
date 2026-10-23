/** A Google sign-in from the login page with no account yet, carried over to the sign-up page. */
export type PendingGoogleSignup = { credential: string; email: string; name: string | null };

const KEY = 'giapha:google-signup';

export function savePendingGoogleSignup(pending: PendingGoogleSignup): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // Without storage the sign-up page simply asks for Google again.
  }
}

/** Reads and forgets the carried-over sign-in, so it is used at most once. */
export function takePendingGoogleSignup(): PendingGoogleSignup | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    return raw ? (JSON.parse(raw) as PendingGoogleSignup) : null;
  } catch {
    return null;
  }
}
