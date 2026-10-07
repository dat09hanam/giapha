import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ApiNotFoundError,
  ApiUnauthorizedError,
  getAuthProfile,
  getDemoFamily,
} from "@/lib/api";
import { profileDestination, type AuthProfile } from "@/lib/auth-api";
import { requirePasswordChanged } from "@/lib/session";

export type FamilyManagerProfile = AuthProfile & {
  /** MEMBER only in the designer, for an account that manages a chi/nhánh. */
  role: "MEMBER_PLUS" | "MEMBER";
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
  requirePasswordChanged(profile, requestedPath);

  // The sample family has no accounts; the platform admin edits it as its clan head.
  if (profile.role === "ADMIN") {
    const demo = await getDemoFamily().catch((error: unknown) => {
      if (error instanceof ApiNotFoundError) return null;
      throw error;
    });
    if (!demo || demo.slug !== slug) redirect("/admin");
    return { ...profile, role: "MEMBER_PLUS", family: demo, sessionToken };
  }

  const branchManager =
    area === "designer" && profile.role === "MEMBER" && profile.managesBranches;
  if (profile.role !== "MEMBER_PLUS" && !branchManager)
    redirect(profileDestination(profile));
  if (!profile.family) redirect("/");
  if (slug !== profile.family.slug)
    redirect(familyManagerPath(area, profile.family.slug));

  return {
    ...profile,
    role: profile.role === "MEMBER_PLUS" ? "MEMBER_PLUS" : "MEMBER",
    family: profile.family,
    sessionToken,
  };
}
