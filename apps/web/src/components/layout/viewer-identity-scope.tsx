'use client';

import type { ReactNode } from 'react';

import { setViewerScope } from '@/lib/viewer-identity';

export function ViewerIdentityScope({
  accountId,
  accountName,
  children,
}: {
  accountId: string;
  accountName: string | null;
  children: ReactNode;
}) {
  setViewerScope({ accountId, accountName });
  return children;
}
