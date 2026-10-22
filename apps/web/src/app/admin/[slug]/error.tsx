'use client';

import { SystemErrorBoundary } from '@/components/ui/system-error-boundary';

export default function FamilyAdminError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <SystemErrorBoundary context="Khu vực quản trị dòng họ" retry={retry} />;
}
