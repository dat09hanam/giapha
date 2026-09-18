import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ApiUnauthorizedError, getAuthProfile } from "@/lib/api";
import { profileDestination, type AuthProfile } from "@/lib/auth-api";

export type FamilyManagerProfile = AuthProfile & {
  role: "MEMBER_PLUS";
  family: NonNullable<AuthProfile["family"]>;
  sessionToken: string;
};

type FamilyManagerArea = "admin" | "designer";

function familyManagerPath(area: FamilyManagerArea, slug: string): string {
  const familySlug = encodeURIComponent(slug);
  return area === "admin" ? `/admin/${familySlug}` : `/${familySlug}/thiet_ke`;
}

export async function requireFamilyManager(
  slug: string,
  area: FamilyManagerArea,
): Promise<FamilyManagerProfile> {
  const requestedPath = familyManagerPath(area, slug);
  const sessionToken = (await cookies()).get("giapha_session")?.value;
  if (!sessionToken)
    redirect(`/login?next=${encodeURIComponent(requestedPath)}`);

  let profile: AuthProfile;
  try {
    profile = await getAuthProfile(sessionToken);
  } catch (error) {
    if (error instanceof ApiUnauthorizedError) {
      redirect(
        `/login?next=${encodeURIComponent(requestedPath)}&reason=session-expired`,
      );
    }
    throw error;
  }

  if (profile.role !== "MEMBER_PLUS") redirect(profileDestination(profile));
  if (!profile.family) redirect("/");
  if (slug !== profile.family.slug)
    redirect(familyManagerPath(area, profile.family.slug));

  return {
    ...profile,
    role: profile.role,
    family: profile.family,
    sessionToken,
  };
}
