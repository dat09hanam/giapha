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
  defaultName,
  children,
}: {
  accountId: string;
  defaultName: string;
  children: ReactNode;
}) {
  setViewerScope({ accountId, defaultName });
  return children;
}
