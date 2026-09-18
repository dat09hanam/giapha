import type { Metadata } from "next";

import { FamilyTreeDesigner } from "@/components/tree/family-tree-designer";
import { ApiErrorState } from "@/components/ui/api-error-state";
import { getFamilyTree } from "@/lib/api";
import { ApiRequestError } from "@/lib/api-error";
import { requireFamilyManager } from "@/lib/family-manager";

type FamilyDesignerPageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "Thiết kế gia phả",
  description: "Không gian thiết kế cấu trúc cây gia phả theo từng thế hệ.",
};

export const dynamic = "force-dynamic";

export default async function FamilyDesignerPage({
  params,
}: FamilyDesignerPageProps) {
  const { slug } = await params;

  try {
    const profile = await requireFamilyManager(slug, "designer");
    const tree = await getFamilyTree(profile.family.slug, profile.sessionToken);

    return (
      <FamilyTreeDesigner
        familyName={profile.family.name}
        familySlug={profile.family.slug}
        initialTree={tree}
      />
    );
  } catch (error: unknown) {
    if (error instanceof ApiRequestError) {
      return (
        <ApiErrorState
          title="Chưa thể mở trang thiết kế"
          message={error.message}
          retryHref={"/" + encodeURIComponent(slug) + "/thiet_ke"}
        />
      );
    }
    throw error;
  }
}
