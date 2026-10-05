import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { LotusArtwork, Mountains } from '@/components/about/about-art';
import { FamilyHeader, type FamilyHeaderViewer } from '@/components/layout/family-header';
import { SiteHeaderBar } from '@/components/layout/site-header';
import { ViewerIdentityScope } from '@/components/layout/viewer-identity-scope';
import { ApiNotFoundError, getAuthProfile, getFamily, getPlatformFeatures } from '@/lib/api';
import type { AuthProfile } from '@/lib/auth-api';
import { familyNav } from '@/lib/family-nav';
import { requirePasswordChanged } from '@/lib/session';
import type { FamilyFeatures } from '@/types/family-tree';

async function loadViewer(slug: string): Promise<FamilyHeaderViewer> {
  const sessionToken = (await cookies()).get('giapha_session')?.value;
  if (!sessionToken) return null;
  let profile: AuthProfile;
  try {
    profile = await getAuthProfile(sessionToken);
  } catch {
    // The pages below handle expired sessions; the header just shows the sign-in link.
    return null;
  }
  requirePasswordChanged(profile, `/${encodeURIComponent(slug)}`);
  return {
    id: profile.id,
    displayName: profile.displayName,
    role: profile.role,
    managesBranches: profile.managesBranches,
  };
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

/** The sections switched on for the platform; null shows them all if they cannot be read. */
async function loadFeatures(): Promise<FamilyFeatures | null> {
  try {
    return await getPlatformFeatures();
  } catch {
    // The API still refuses a switched-off section.
    return null;
  }
}

/** Far mountains and lotus behind the desktop pages, as on the family's paper. */
function PaperScenery() {
  return (
    <div
      className="pointer-events-none fixed inset-y-0 left-60 right-0 -z-10 hidden lg:block print:hidden"
      aria-hidden="true"
    >
      <Mountains className="absolute inset-x-0 bottom-0 h-40 w-full opacity-70" />
      <LotusArtwork className="absolute -bottom-2 left-4 w-40 opacity-30" />
      <LotusArtwork className="absolute -bottom-2 right-4 w-44 -scale-x-100 opacity-30" />
    </div>
  );
}

/**
 * The navigation around every page of a family, for members and the clan
 * head alike: a sidebar on desktops, a bottom tab bar on phones and tablets.
 */
export async function FamilyChrome({ slug, children }: { slug: string; children: ReactNode }) {
  const [name, features, viewer] = await Promise.all([
    loadFamilyName(slug),
    loadFeatures(),
    loadViewer(slug),
  ]);

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
      <FamilyHeader
        family={{ slug, name }}
        nav={familyNav(features)}
        viewer={viewer}
      />
      {/* Below lg the navigation is a 4rem bar fixed to the bottom; keep content above it.
          From lg it is a 15rem sidebar on the left. */}
      <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-60 print:p-0">
        <PaperScenery />
        {children}
      </div>
    </ViewerIdentityScope>
  );
}
