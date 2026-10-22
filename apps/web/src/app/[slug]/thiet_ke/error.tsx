'use client';

import { SystemErrorBoundary } from '@/components/ui/system-error-boundary';

export default function FamilyDesignerError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <SystemErrorBoundary context="Trang thiết kế gia phả" retry={retry} />;
}
