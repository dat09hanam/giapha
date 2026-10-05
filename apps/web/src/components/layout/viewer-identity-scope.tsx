'use client';

import type { ReactNode } from 'react';

import { setViewerScope } from '@/lib/viewer-identity';

/**
 * Points the stored viewer name and device key at the signed-in account.
 * It sets the scope while rendering, ahead of everything inside it, so the
 * first read below already sees the right account.
 */
export function ViewerIdentityScope({
  accountId,
  accountName,
  children,
}: {
  accountId: string;
  /** A personal account's own name; null for the members' shared account. */
  accountName: string | null;
  children: ReactNode;
}) {
  setViewerScope({ accountId, accountName });
  return children;
}
