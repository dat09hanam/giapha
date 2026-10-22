'use client';

import { Home, RefreshCw, Wrench } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ErrorState, MAINTENANCE_COPY } from '@/components/ui/error-state';

type SystemErrorBoundaryProps = {
  /** What the segment was loading, e.g. "Khu vực quản trị". */
  context?: string;
  retry: () => void;
};

/**
 * Body for `error.tsx` files. An error that reaches a boundary is an unhandled server or
 * render failure (its message is hidden in production), so it is always shown as maintenance.
 */
export function SystemErrorBoundary({ context, retry }: SystemErrorBoundaryProps) {
  return (
    <ErrorState
      tone="system"
      icon={Wrench}
      context={context}
      {...MAINTENANCE_COPY}
      actions={
        <>
          <Button type="button" onClick={retry}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Thử lại
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="size-4" aria-hidden="true" />
              Về trang chủ
            </Link>
          </Button>
        </>
      }
    />
  );
}
