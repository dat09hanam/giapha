import type { ReactNode } from 'react';

import { FamilyChrome } from '@/components/layout/family-chrome';

/** Every page of a family shares its navigation, with the family's sections. */
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
