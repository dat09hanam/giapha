import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { FamilyHeader, type FamilyHeaderViewer } from '@/components/layout/family-header';
import { SiteHeaderBar } from '@/components/layout/site-header';
import { StorageWarningBanner } from '@/components/layout/storage-warning-banner';
import { ViewerIdentityScope } from '@/components/layout/viewer-identity-scope';
import {
  ApiNotFoundError,
  getAuthProfile,
  getFamily,
  getFamilyFeatures,
  getFamilyPlanLimits,
} from '@/lib/api';
import type { AuthProfile } from '@/lib/auth-api';
import { toFamilyStorage, type FamilyStorage } from '@/lib/family-storage';
import { familyNav } from '@/lib/family-nav';
import { requirePasswordChanged } from '@/lib/session';
import type { FamilyFeatures } from '@/types/family-tree';

async function loadViewer(
  slug: string,
): Promise<{ viewer: FamilyHeaderViewer; storage: FamilyStorage | null }> {
  const sessionToken = (await cookies()).get('giapha_session')?.value;
  if (!sessionToken) return { viewer: null, storage: null };
  let profile: AuthProfile;
  try {
    profile = await getAuthProfile(sessionToken);
  } catch {
    return { viewer: null, storage: null };
  }
  requirePasswordChanged(profile, `/${encodeURIComponent(slug)}`);
  return {
    viewer: {
      id: profile.id,
      displayName: profile.displayName,
      role: profile.role,
      managesBranches: profile.managesBranches,
      // Only personal manager logins sign in with Google; shared family logins never do.
      canLinkGoogle:
        !profile.googleLinked &&
        !profile.isShared &&
        (profile.role === 'MEMBER_PLUS' || profile.managesBranches),
    },
    storage: profile.role === 'MEMBER_PLUS' ? await loadStorage(slug, sessionToken) : null,
  };
}

/** Only for the warning banner: a failure just means no banner. */
async function loadStorage(slug: string, sessionToken: string): Promise<FamilyStorage | null> {
  try {
    return toFamilyStorage(await getFamilyPlanLimits(slug, sessionToken));
  } catch {
    return null;
  }
}

async function loadFamilyName(slug: string): Promise<string | null> {
  try {
    return (await getFamily(slug)).name;
  } catch (error: unknown) {
    if (error instanceof ApiNotFoundError) return null;
    return slug;
  }
}

async function loadFeatures(slug: string): Promise<FamilyFeatures | null> {
  try {
    return await getFamilyFeatures(slug);
  } catch {
    return null;
  }
}

const FAMILY_BACKGROUND = '/images/decorations/family-background.png';

function PageBackground({ plain }: { plain: boolean }) {
  if (plain) {
    return (
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[#faf6ee] lg:left-60 print:hidden"
        aria-hidden="true"
      />
    );
  }
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat lg:left-60 print:hidden"
        style={{ backgroundImage: `url("${FAMILY_BACKGROUND}")` }}
        aria-hidden="true"
      />
      <div
        className="content-veil pointer-events-none fixed inset-0 -z-10 lg:left-60 print:hidden"
        aria-hidden="true"
      />
    </>
  );
}

export async function FamilyChrome({
  slug,
  children,
  plainBackground = false,
}: {
  slug: string;
  children: ReactNode;
  /** A flat cream page instead of the landscape, for form-heavy pages. */
  plainBackground?: boolean;
}) {
  const [name, features, { viewer, storage }] = await Promise.all([
    loadFamilyName(slug),
    loadFeatures(slug),
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
        editSuggestions={features?.editSuggestions ?? true}
      />
      <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-60 print:p-0">
        <PageBackground plain={plainBackground} />
        {storage ? <StorageWarningBanner slug={slug} storage={storage} /> : null}
        {children}
      </div>
    </ViewerIdentityScope>
  );
}
