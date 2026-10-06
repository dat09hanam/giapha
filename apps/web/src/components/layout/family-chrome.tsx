import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

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

/**
 * The background picture behind every family page, fixed while the page scrolls. Until the
 * file exists the paper on <html> shows through (globals.css).
 */
const FAMILY_BACKGROUND = '/images/decorations/family-background.png';

function PageBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat lg:left-60 print:hidden"
      style={{ backgroundImage: `url("${FAMILY_BACKGROUND}")` }}
      aria-hidden="true"
    />
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
      <FamilyHeader family={{ slug, name }} nav={familyNav(features)} viewer={viewer} />
      {/* Below lg the navigation is a 4rem bar fixed to the bottom; keep content above it.
          From lg it is a 15rem sidebar on the left. */}
      <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-60 print:p-0">
        <PageBackground />
        {children}
      </div>
    </ViewerIdentityScope>
  );
}
