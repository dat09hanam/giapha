import type { ReactNode } from 'react';

import { FamilyChrome } from '@/components/layout/family-chrome';

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
