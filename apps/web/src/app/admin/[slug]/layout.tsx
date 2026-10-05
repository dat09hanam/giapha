import type { ReactNode } from 'react';

import { FamilyChrome } from '@/components/layout/family-chrome';

/** The clan head's admin pages wear the family's navigation, like its other pages. */
export default async function FamilyAdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <FamilyChrome slug={slug}>{children}</FamilyChrome>;
}
