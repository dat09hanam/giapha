import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { FamilyHeader, type FamilyHeaderViewer } from '@/components/layout/family-header';
import { SiteHeaderBar } from '@/components/layout/site-header';
import { ViewerIdentityScope } from '@/components/layout/viewer-identity-scope';
import { ApiNotFoundError, getAuthProfile, getFamily, getFamilyFeatures } from '@/lib/api';
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

function PageBackground() {
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

export async function FamilyChrome({ slug, children }: { slug: string; children: ReactNode }) {
  const [name, features, viewer] = await Promise.all([
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
      <FamilyHeader family={{ slug, name }} nav={familyNav(features)} viewer={viewer} />
      <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-60 print:p-0">
        <PageBackground />
        {children}
      </div>
    </ViewerIdentityScope>
  );
}
