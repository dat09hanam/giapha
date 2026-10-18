import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { FamilyChrome } from '@/components/layout/family-chrome';
import { NO_INDEX } from '@/lib/seo';

/** Family spaces hold private genealogy data and require sign-in, so they stay unindexed. */
export const metadata: Metadata = { robots: NO_INDEX };

export default async function FamilyLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <FamilyChrome slug={slug}>{children}</FamilyChrome>;
}
