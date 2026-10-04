import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { FamilyHeader, type FamilyHeaderViewer } from '@/components/layout/family-header';
import { SiteHeaderBar } from '@/components/layout/site-header';
import { ViewerIdentityScope } from '@/components/layout/viewer-identity-scope';
import { ApiNotFoundError, getAuthProfile, getFamily } from '@/lib/api';

async function loadViewer(): Promise<FamilyHeaderViewer> {
  const sessionToken = (await cookies()).get('giapha_session')?.value;
  if (!sessionToken) return null;
  try {
    const profile = await getAuthProfile(sessionToken);
    return {
      id: profile.id,
      displayName: profile.displayName,
      role: profile.role,
      managesBranches: profile.managesBranches,
    };
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

/**
 * The navigation around every page of a family, for members and the clan
 * head alike: a top bar on desktops, a bottom tab bar on phones and tablets.
 */
export async function FamilyChrome({ slug, children }: { slug: string; children: ReactNode }) {
  const [name, viewer] = await Promise.all([loadFamilyName(slug), loadViewer()]);

  if (name === null) {
    return (
      <>
        <SiteHeaderBar />
        {children}
      </>
    );
  }

  return (
    // The clan head's and a branch manager's accounts are personal, so they always post under
    // their own name (the API enforces it); the members' shared account asks each phone for one.
    <ViewerIdentityScope
      accountId={viewer?.id ?? 'guest'}
      accountName={
        viewer?.role === 'MEMBER_PLUS' || viewer?.managesBranches ? viewer.displayName : null
      }
    >
      <FamilyHeader family={{ slug, name }} viewer={viewer} />
      {/* Below lg the navigation is a 4rem bar fixed to the bottom; keep content above it. */}
      <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</div>
    </ViewerIdentityScope>
  );
}
