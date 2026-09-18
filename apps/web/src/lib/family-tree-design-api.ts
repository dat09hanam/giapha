import { apiFetch } from "@/lib/api-error";
import type { Gender } from "@/types/family-tree";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"
).replace(/\/$/, "");

export type DesignerPersonSaveInput = {
  name: string;
  gender: Gender;
  birthDate: string | null;
  deathDate: string | null;
  isAlive: boolean;
  generation: number;
  orderInFamily: number;
  fatherId: string | null;
  motherId: string | null;
};

export type SavedDesignerPerson = {
  id: string;
};

export type FamilyTreeDesignSaveInput = {
  people: Array<{
    clientId: string;
    databaseId: string | null;
    name: string;
    gender: Gender;
    birthYear: number | null;
    deathYear: number | null;
    generation: number;
    orderInFamily: number;
    fatherClientId: string | null;
    motherClientId: string | null;
  }>;
  relationships: Array<{
    husbandClientId: string;
    wifeClientId: string;
    wifeOrder: number;
  }>;
  deletedPersonIds: string[];
};

export type FamilyTreeDesignSaveResult = {
  savedPeople: Array<{
    clientId: string;
    databaseId: string;
  }>;
  savedRelationshipCount: number;
  deletedPersonCount: number;
};

export function saveDesignerPerson(
  slug: string,
  databaseId: string | null,
  input: DesignerPersonSaveInput,
): Promise<SavedDesignerPerson> {
  const path = databaseId
    ? "/families/" +
      encodeURIComponent(slug) +
      "/people/" +
      encodeURIComponent(databaseId)
    : "/families/" + encodeURIComponent(slug) + "/people";

  return apiFetch<SavedDesignerPerson>(
    API_URL + path,
    {
      method: databaseId ? "PATCH" : "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
    databaseId ? "cập nhật thành viên" : "lưu thành viên",
  );
}

export function saveFamilyTreeDesign(
  slug: string,
  input: FamilyTreeDesignSaveInput,
): Promise<FamilyTreeDesignSaveResult> {
  return apiFetch<FamilyTreeDesignSaveResult>(
    API_URL + "/families/" + encodeURIComponent(slug) + "/tree/design",
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
    "lưu toàn bộ gia phả",
  );
}
