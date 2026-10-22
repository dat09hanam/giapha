'use client';

import { useEffect } from 'react';

import { SystemErrorBoundary } from '@/components/ui/system-error-boundary';

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <SystemErrorBoundary retry={retry} />;
}
