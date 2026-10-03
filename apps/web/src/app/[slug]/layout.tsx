import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { FamilyHeader, type FamilyHeaderViewer } from '@/components/layout/family-header';
import { SiteHeaderBar } from '@/components/layout/site-header';
import { ApiNotFoundError, getAuthProfile, getFamily } from '@/lib/api';

async function loadViewer(): Promise<FamilyHeaderViewer> {
  const sessionToken = (await cookies()).get('giapha_session')?.value;
  if (!sessionToken) return null;
  try {
    const profile = await getAuthProfile(sessionToken);
    return { displayName: profile.displayName, role: profile.role };
  } catch {
    // The pages below handle expired sessions; the header just shows the sign-in link.
    return null;
  }
}

/** The family's name; null when no family has this slug. */
async function loadFamilyName(slug: string): Promise<string | null> {
  try {
    return (await getFamily(slug)).name;
  } catch (error: unknown) {
    if (error instanceof ApiNotFoundError) return null;
    // The pages below show the error state; the header falls back to the slug.
    return slug;
  }
}

/** Every page of a family shares its header, with the family's sections. */
export default async function FamilyLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [name, viewer] = await Promise.all([loadFamilyName(slug), loadViewer()]);

  return (
    <>
      {name === null ? <SiteHeaderBar /> : <FamilyHeader family={{ slug, name }} viewer={viewer} />}
      {children}
    </>
  );
}
