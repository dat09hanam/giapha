"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Panel,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Baby,
  Check,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  CircleAlert,
  HeartHandshake,
  LoaderCircle,
  Network,
  Plus,
  Save,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ImageCropper } from "@/components/ui/image-cropper";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { useToast } from "@/components/ui/toast";
import { DeathAnniversaryPicker } from "@/components/ui/death-anniversary-picker";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_SOURCE_IMAGE_BYTES,
  deleteFamilyMedia,
  familyMediaSrc,
  uploadFamilyMedia,
} from "@/lib/media-api";
import {
  saveFamilyTreeDesign,
  type FamilyTreeDesignSaveInput,
} from "@/lib/family-tree-design-api";
import { cn } from "@/lib/utils";
import type { FamilyTreeResponse, Gender, Person } from "@/types/family-tree";

type DesignerGender = Gender;

type DesignerMember = {
  id: string;
  databaseId: string | null;
  name: string;
  nickname: string;
  courtesyName: string;
  gender: DesignerGender;
  /** yyyy-mm-dd, as a native date input holds it. */
  birthDate: string;
  deathDate: string;
  /** DD/MM lunar anniversary, matching DeathAnniversaryPicker. */
  lunarDeathAnniversary: string;
  isAlive: boolean;
  burialPlace: string;
  phone: string;
  avatarUrl: string;
  biography: string;
};

type FamilyBranch = {
  id: string;
  primary: DesignerMember;
  spouses: DesignerMember[];
  children: FamilyBranch[];
};

type RelationshipKind = "WIFE" | "HUSBAND" | "SON" | "DAUGHTER";

type RelationshipChoice = {
  kind: RelationshipKind;
  label: string;
  description: string;
  icon: LucideIcon;
};

type DesignerNodeData = {
  member: DesignerMember;
  /** Resolved here because the node itself has no access to the family slug. */
  avatarSrc: string | null;
  selected: boolean;
  onSelect: (memberId: string) => void;
  onAddRelationship: (memberId: string) => void;
};

type DesignerFlowNode = Node<DesignerNodeData, "designerPerson">;

const NODE_WIDTH = 214;
const SPOUSE_GAP = 70;
const CHILD_GAP = 84;
const GENERATION_GAP = 260;

const RELATIONSHIP_CHOICES: RelationshipChoice[] = [
  {
    kind: "WIFE",
    label: "Vợ",
    description: "Thêm một khung cùng hàng",
    icon: HeartHandshake,
  },
  {
    kind: "HUSBAND",
    label: "Chồng",
    description: "Thêm một khung cùng hàng",
    icon: HeartHandshake,
  },
  {
    kind: "SON",
    label: "Con trai",
    description: "Thêm một khung ở hàng dưới",
    icon: Baby,
  },
  {
    kind: "DAUGHTER",
    label: "Con gái",
    description: "Thêm một khung ở hàng dưới",
    icon: Baby,
  },
];

const GENDER_CHOICES: ReadonlyArray<{
  value: Extract<DesignerGender, "MALE" | "FEMALE">;
  label: string;
}> = [
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
];

const SPOUSE_KINDS: ReadonlySet<RelationshipKind> = new Set<RelationshipKind>([
  "WIFE",
  "HUSBAND",
]);

function oppositeGender(gender: DesignerGender): DesignerGender | null {
  if (gender === "MALE") return "FEMALE";
  if (gender === "FEMALE") return "MALE";
  return null;
}

function relationshipGender(
  kind: RelationshipKind,
  sourceGender: DesignerGender,
): DesignerGender {
  if (SPOUSE_KINDS.has(kind)) {
    const spouseGender = oppositeGender(sourceGender);
    if (spouseGender) return spouseGender;

    return kind === "WIFE" ? "FEMALE" : "MALE";
  }

  return kind === "DAUGHTER" ? "FEMALE" : "MALE";
}

function relationshipChoiceBlockedReason(
  kind: RelationshipKind,
  sourceGender: DesignerGender,
): string | null {
  if (kind === "HUSBAND" && sourceGender === "MALE") {
    return "Thành viên đang chọn là nam nên không thể thêm chồng.";
  }

  if (kind === "WIFE" && sourceGender === "FEMALE") {
    return "Thành viên đang chọn là nữ nên không thể thêm vợ.";
  }

  return null;
}

const genderStyles: Record<DesignerGender, string> = {
  MALE: "bg-sky-100 text-sky-800 ring-sky-200",
  FEMALE: "bg-rose-100 text-rose-800 ring-rose-200",
  OTHER: "bg-violet-100 text-violet-800 ring-violet-200",
  UNKNOWN: "bg-amber-50 text-amber-800 ring-amber-200",
};

const genderLabels: Record<DesignerGender, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Giới tính khác",
  UNKNOWN: "Chưa xác định giới tính",
};

/** Stands in for a missing photo on every avatar circle in the designer. */
function GenderAvatarFallback({ gender }: { gender: DesignerGender }) {
  return (
    <>
      <PersonAvatar gender={gender} className="size-full" />
      <span className="sr-only">{genderLabels[gender]}</span>
    </>
  );
}

function memberYears(member: DesignerMember): string {
  const birthYear = member.birthDate.slice(0, 4);
  const deathYear = member.deathDate.slice(0, 4);
  if (!birthYear && !deathYear) return "Chưa cập nhật năm sinh";

  const end = deathYear || (member.isAlive ? "nay" : "?");
  return (birthYear || "?") + " – " + end;
}

function DesignerPersonNode({ data }: NodeProps<DesignerFlowNode>) {
  return (
    <article
      aria-current={data.selected ? "true" : undefined}
      className={cn(
        "relative w-[214px] overflow-hidden rounded-2xl border bg-[#fffdf8] shadow-lg shadow-emerald-950/10 transition duration-200",
        data.selected
          ? "scale-[1.03] border-emerald-700 bg-emerald-50 shadow-2xl shadow-emerald-950/25 ring-4 ring-emerald-500/30"
          : "border-amber-900/20 hover:border-amber-700/45",
      )}
    >
      <Handle
        id="parent-target"
        type="target"
        position={Position.Top}
        className="!size-2 !border-0 !bg-amber-700"
      />
      <Handle
        id="spouse-target"
        type="target"
        position={Position.Left}
        className="!size-2 !border-0 !bg-amber-700"
      />

      <button
        type="button"
        className="block w-full px-4 pb-3 pt-4 text-left"
        onClick={() => data.onSelect(data.member.id)}
        aria-pressed={data.selected}
      >
        <span
          className={cn(
            "mx-auto grid size-16 place-items-center overflow-hidden rounded-full ring-1",
            genderStyles[data.member.gender],
            data.selected && "ring-4 ring-emerald-600/25",
          )}
        >
          {data.avatarSrc ? (
            // Avatars are served by the API, outside next/image's loader.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.avatarSrc}
              alt=""
              className="size-full object-cover"
              draggable={false}
            />
          ) : (
            <GenderAvatarFallback gender={data.member.gender} />
          )}
        </span>
        <span
          className="mt-3 block truncate text-center font-semibold text-emerald-950"
          title={data.member.name}
        >
          {data.member.name}
        </span>
        <span className="mt-1 block text-center text-xs text-stone-500">
          {memberYears(data.member)}
        </span>
      </button>

      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-center gap-1.5 border-t border-amber-900/10 px-3 py-2.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-700",
          data.selected
            ? "bg-emerald-100/80 text-emerald-950"
            : "bg-amber-50/70",
        )}
        onClick={() => data.onAddRelationship(data.member.id)}
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Thêm quan hệ
      </button>

      <Handle
        id="spouse-source"
        type="source"
        position={Position.Right}
        className="!size-2 !border-0 !bg-amber-700"
      />
      <Handle
        id="child-source"
        type="source"
        position={Position.Bottom}
        className="!size-2 !border-0 !bg-amber-700"
      />
    </article>
  );
}

const nodeTypes = { designerPerson: DesignerPersonNode } satisfies NodeTypes;

function dateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function lunarAnniversaryInput(
  day: number | null,
  month: number | null,
): string {
  if (!day || !month) return "";
  return String(day).padStart(2, "0") + "/" + String(month).padStart(2, "0");
}

function parseLunarAnniversary(value: string): {
  day: number | null;
  month: number | null;
} {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return { day: null, month: null };

  return { day: Number(match[1]), month: Number(match[2]) };
}

function trimmedOrNull(value: string): string | null {
  return value.trim() || null;
}

function toDesignerMember(person: Person): DesignerMember {
  return {
    id: person.id,
    databaseId: person.id,
    name: person.name,
    nickname: person.nickname ?? "",
    courtesyName: person.courtesyName ?? "",
    gender: person.gender,
    birthDate: dateInputValue(person.birthDate),
    deathDate: dateInputValue(person.deathDate),
    lunarDeathAnniversary: lunarAnniversaryInput(
      person.lunarDeathDay,
      person.lunarDeathMonth,
    ),
    isAlive: person.isAlive,
    burialPlace: person.burialPlace ?? "",
    phone: person.phone ?? "",
    avatarUrl: person.avatarUrl ?? "",
    biography: person.biography ?? "",
  };
}

function sortPeople(left: Person, right: Person): number {
  return (
    (left.generation ?? Number.MAX_SAFE_INTEGER) -
      (right.generation ?? Number.MAX_SAFE_INTEGER) ||
    (left.orderInFamily ?? Number.MAX_SAFE_INTEGER) -
      (right.orderInFamily ?? Number.MAX_SAFE_INTEGER) ||
    left.name.localeCompare(right.name, "vi")
  );
}

function createInitialBranch(initialTree: FamilyTreeResponse): FamilyBranch {
  const people = [...initialTree.people].sort(sortPeople);

  if (people.length === 0) {
    return {
      id: "branch-root",
      primary: {
        id: "member-root",
        databaseId: null,
        name: "Thành viên khởi điểm",
        nickname: "",
        courtesyName: "",
        gender: "MALE",
        birthDate: "",
        deathDate: "",
        lunarDeathAnniversary: "",
        isAlive: true,
        burialPlace: "",
        phone: "",
        avatarUrl: "",
        biography: "",
      },
      spouses: [],
      children: [],
    };
  }

  const peopleById = new Map(people.map((person) => [person.id, person]));
  const wifeIds = new Set(
    initialTree.relationships.map((relationship) => relationship.wifeId),
  );
  const rootPerson =
    people.find(
      (person) =>
        !person.fatherId && !person.motherId && !wifeIds.has(person.id),
    ) ??
    people.find((person) => !person.fatherId && !person.motherId) ??
    people[0]!;
  const visited = new Set<string>();

  function buildBranch(primary: Person): FamilyBranch {
    visited.add(primary.id);

    const spousePeople = initialTree.relationships
      .filter(
        (relationship) =>
          relationship.husbandId === primary.id ||
          relationship.wifeId === primary.id,
      )
      .sort((left, right) => (left.wifeOrder ?? 1) - (right.wifeOrder ?? 1))
      .map((relationship) =>
        peopleById.get(
          relationship.husbandId === primary.id
            ? relationship.wifeId
            : relationship.husbandId,
        ),
      )
      .filter(
        (person): person is Person =>
          person !== undefined && !visited.has(person.id),
      );

    spousePeople.forEach((person) => visited.add(person.id));
    const parentIds = new Set([
      primary.id,
      ...spousePeople.map((person) => person.id),
    ]);
    const children = people
      .filter(
        (person) =>
          !visited.has(person.id) &&
          ((person.fatherId && parentIds.has(person.fatherId)) ||
            (person.motherId && parentIds.has(person.motherId))),
      )
      .sort(sortPeople)
      .map(buildBranch);

    return {
      id: "branch-" + primary.id,
      primary: toDesignerMember(primary),
      spouses: spousePeople.map(toDesignerMember),
      children,
    };
  }

  return buildBranch(rootPerson);
}

function branchWidth(branch: FamilyBranch): number {
  const coupleCount = 1 + branch.spouses.length;
  const coupleWidth =
    coupleCount * NODE_WIDTH + Math.max(0, coupleCount - 1) * SPOUSE_GAP;
  const childWidths = branch.children.map(branchWidth);
  const childrenWidth =
    childWidths.reduce((total, width) => total + width, 0) +
    Math.max(0, childWidths.length - 1) * CHILD_GAP;

  return Math.max(NODE_WIDTH, coupleWidth, childrenWidth);
}

function createFlowElements(
  root: FamilyBranch,
  familySlug: string,
  avatarPreviews: ReadonlyMap<string, string>,
  selectedMemberId: string,
  onSelect: (memberId: string) => void,
  onAddRelationship: (memberId: string) => void,
): { nodes: DesignerFlowNode[]; edges: Edge[] } {
  const nodes: DesignerFlowNode[] = [];
  const edges: Edge[] = [];

  function placeBranch(
    branch: FamilyBranch,
    left: number,
    depth: number,
  ): void {
    const width = branchWidth(branch);
    const members = [branch.primary, ...branch.spouses];
    const coupleWidth =
      members.length * NODE_WIDTH +
      Math.max(0, members.length - 1) * SPOUSE_GAP;
    const coupleLeft = left + (width - coupleWidth) / 2;
    const y = depth * GENERATION_GAP;

    members.forEach((member, index) => {
      const isSelected = member.id === selectedMemberId;
      nodes.push({
        id: member.id,
        type: "designerPerson",
        selected: isSelected,
        position: {
          x: coupleLeft + index * (NODE_WIDTH + SPOUSE_GAP),
          y,
        },
        data: {
          member,
          avatarSrc:
            avatarPreviews.get(member.id) ??
            (member.avatarUrl
              ? familyMediaSrc(familySlug, member.avatarUrl)
              : null),
          selected: isSelected,
          onSelect,
          onAddRelationship,
        },
      });

      if (index > 0) {
        edges.push({
          id: "spouse-" + branch.primary.id + "-" + member.id,
          source: branch.primary.id,
          sourceHandle: "spouse-source",
          target: member.id,
          targetHandle: "spouse-target",
          type: "straight",
          style: { stroke: "#9a6b2f", strokeWidth: 1.8 },
        });
      }
    });

    if (branch.children.length === 0) return;

    const childWidths = branch.children.map(branchWidth);
    const childrenWidth =
      childWidths.reduce((total, childWidth) => total + childWidth, 0) +
      Math.max(0, childWidths.length - 1) * CHILD_GAP;
    let childLeft = left + (width - childrenWidth) / 2;

    branch.children.forEach((child, index) => {
      edges.push({
        id: "child-" + branch.primary.id + "-" + child.primary.id,
        source: branch.primary.id,
        sourceHandle: "child-source",
        target: child.primary.id,
        targetHandle: "parent-target",
        type: "smoothstep",
        style: { stroke: "#9a6b2f", strokeWidth: 1.8 },
      });

      placeBranch(child, childLeft, depth + 1);
      childLeft += childWidths[index]! + CHILD_GAP;
    });
  }

  const width = branchWidth(root);
  placeBranch(root, -width / 2, 0);
  return { nodes, edges };
}

function findBranchContainingMember(
  branch: FamilyBranch,
  memberId: string,
): FamilyBranch | null {
  if (
    branch.primary.id === memberId ||
    branch.spouses.some((member) => member.id === memberId)
  ) {
    return branch;
  }

  for (const child of branch.children) {
    const found = findBranchContainingMember(child, memberId);
    if (found) return found;
  }

  return null;
}

function findMember(
  branch: FamilyBranch,
  memberId: string,
): DesignerMember | null {
  if (branch.primary.id === memberId) return branch.primary;

  const spouse = branch.spouses.find((member) => member.id === memberId);
  if (spouse) return spouse;

  for (const child of branch.children) {
    const member = findMember(child, memberId);
    if (member) return member;
  }

  return null;
}

function updateMember(
  branch: FamilyBranch,
  memberId: string,
  update: (member: DesignerMember) => DesignerMember,
): FamilyBranch {
  return {
    ...branch,
    primary:
      branch.primary.id === memberId ? update(branch.primary) : branch.primary,
    spouses: branch.spouses.map((member) =>
      member.id === memberId ? update(member) : member,
    ),
    children: branch.children.map((child) =>
      updateMember(child, memberId, update),
    ),
  };
}

function updateBranchContainingMember(
  branch: FamilyBranch,
  memberId: string,
  update: (current: FamilyBranch) => FamilyBranch,
): FamilyBranch {
  const belongsToBranch =
    branch.primary.id === memberId ||
    branch.spouses.some((member) => member.id === memberId);

  if (belongsToBranch) return update(branch);

  return {
    ...branch,
    children: branch.children.map((child) =>
      updateBranchContainingMember(child, memberId, update),
    ),
  };
}

function deletionFallbackMemberId(
  branch: FamilyBranch,
  memberId: string,
): string | null {
  if (branch.spouses.some((member) => member.id === memberId))
    return branch.primary.id;

  for (const child of branch.children) {
    if (child.primary.id === memberId) return branch.primary.id;

    const fallbackMemberId = deletionFallbackMemberId(child, memberId);
    if (fallbackMemberId) return fallbackMemberId;
  }

  return null;
}

function removeMember(branch: FamilyBranch, memberId: string): FamilyBranch {
  return {
    ...branch,
    spouses: branch.spouses.filter((member) => member.id !== memberId),
    children: branch.children
      .filter((child) => child.primary.id !== memberId)
      .map((child) => removeMember(child, memberId)),
  };
}

function isPrimaryMember(branch: FamilyBranch, memberId: string): boolean {
  if (branch.primary.id === memberId) return true;
  return branch.children.some((child) => isPrimaryMember(child, memberId));
}

function countMembers(branch: FamilyBranch): number {
  return (
    1 +
    branch.spouses.length +
    branch.children.reduce((total, child) => total + countMembers(child), 0)
  );
}

function createMember(gender: DesignerGender): DesignerMember {
  return {
    id: globalThis.crypto.randomUUID(),
    databaseId: null,
    name: "Thành viên mới",
    nickname: "",
    courtesyName: "",
    gender,
    birthDate: "",
    deathDate: "",
    lunarDeathAnniversary: "",
    isAlive: true,
    burialPlace: "",
    phone: "",
    avatarUrl: "",
    biography: "",
  };
}

const fieldClassName =
  "h-11 min-w-0 rounded-xl border bg-white px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";

function DesignerTextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  maxLength,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "tel" | "url";
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5" htmlFor={id}>
      <span className="text-sm font-medium text-emerald-950">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className={fieldClassName}
      />
    </label>
  );
}

function collectMembers(branch: FamilyBranch): DesignerMember[] {
  return [
    branch.primary,
    ...branch.spouses,
    ...branch.children.flatMap(collectMembers),
  ];
}

function buildDesignPayload(
  root: FamilyBranch,
  deletedPersonIds: string[],
): FamilyTreeDesignSaveInput {
  const people: FamilyTreeDesignSaveInput["people"] = [];
  const relationships: FamilyTreeDesignSaveInput["relationships"] = [];

  function visitBranch(
    branch: FamilyBranch,
    generation: number,
    orderInFamily: number,
    fatherClientId: string | null,
    motherClientId: string | null,
  ): void {
    const members = [branch.primary, ...branch.spouses];

    members.forEach((member, memberIndex) => {
      const lunar = parseLunarAnniversary(member.lunarDeathAnniversary);
      people.push({
        clientId: member.id,
        databaseId: member.databaseId,
        name: member.name.trim(),
        nickname: trimmedOrNull(member.nickname),
        courtesyName: trimmedOrNull(member.courtesyName),
        gender: member.gender,
        birthDate: member.birthDate || null,
        deathDate: member.deathDate || null,
        lunarDeathDay: lunar.day,
        lunarDeathMonth: lunar.month,
        isAlive: member.isAlive,
        burialPlace: trimmedOrNull(member.burialPlace),
        phone: trimmedOrNull(member.phone),
        avatarUrl: trimmedOrNull(member.avatarUrl),
        biography: trimmedOrNull(member.biography),
        generation,
        orderInFamily: memberIndex === 0 ? orderInFamily : memberIndex,
        fatherClientId: memberIndex === 0 ? fatherClientId : null,
        motherClientId: memberIndex === 0 ? motherClientId : null,
      });
    });

    branch.spouses.forEach((spouse, index) => {
      const primaryIsWife =
        branch.primary.gender === "FEMALE" && spouse.gender !== "FEMALE";
      relationships.push({
        husbandClientId: primaryIsWife ? spouse.id : branch.primary.id,
        wifeClientId: primaryIsWife ? branch.primary.id : spouse.id,
        wifeOrder: index + 1,
      });
    });

    const father =
      members.find((member) => member.gender === "MALE") ??
      (branch.primary.gender !== "FEMALE" ? branch.primary : null);
    const mother =
      members.find((member) => member.gender === "FEMALE") ??
      (branch.primary.gender === "FEMALE" ? branch.primary : null);

    branch.children.forEach((child, childIndex) => {
      visitBranch(
        child,
        generation + 1,
        childIndex + 1,
        father?.id ?? null,
        mother?.id ?? null,
      );
    });
  }

  visitBranch(root, 1, 1, null, null);
  return { people, relationships, deletedPersonIds };
}

function applyDatabaseIds(
  branch: FamilyBranch,
  databaseIds: ReadonlyMap<string, string>,
): FamilyBranch {
  const updateDatabaseId = (member: DesignerMember): DesignerMember => ({
    ...member,
    databaseId: databaseIds.get(member.id) ?? member.databaseId,
  });

  return {
    ...branch,
    primary: updateDatabaseId(branch.primary),
    spouses: branch.spouses.map(updateDatabaseId),
    children: branch.children.map((child) =>
      applyDatabaseIds(child, databaseIds),
    ),
  };
}

function applyAvatarUrls(
  branch: FamilyBranch,
  avatarUrls: ReadonlyMap<string, string>,
): FamilyBranch {
  const updateAvatar = (member: DesignerMember): DesignerMember => {
    const avatarUrl = avatarUrls.get(member.id);
    return avatarUrl ? { ...member, avatarUrl } : member;
  };

  return {
    ...branch,
    primary: updateAvatar(branch.primary),
    spouses: branch.spouses.map(updateAvatar),
    children: branch.children.map((child) =>
      applyAvatarUrls(child, avatarUrls),
    ),
  };
}

function collectDatabaseIds(branch: FamilyBranch): string[] {
  return [
    branch.primary.databaseId,
    ...branch.spouses.map((member) => member.databaseId),
    ...branch.children.flatMap(collectDatabaseIds),
  ].filter((databaseId): databaseId is string => Boolean(databaseId));
}

function databaseIdsRemovedByDeletion(
  branch: FamilyBranch,
  memberId: string,
): string[] {
  const spouse = branch.spouses.find((member) => member.id === memberId);
  if (spouse) return spouse.databaseId ? [spouse.databaseId] : [];

  for (const child of branch.children) {
    if (child.primary.id === memberId) return collectDatabaseIds(child);

    const nestedDatabaseIds = databaseIdsRemovedByDeletion(child, memberId);
    if (nestedDatabaseIds.length > 0) return nestedDatabaseIds;
  }

  return [];
}

function validateMemberForSave(member: DesignerMember): string | null {
  if (!member.name.trim()) return "Vui lòng nhập họ và tên thành viên.";

  if (
    member.birthDate &&
    member.deathDate &&
    member.deathDate < member.birthDate
  ) {
    return "Ngày mất không được trước ngày sinh.";
  }

  return null;
}

export function FamilyTreeDesigner({
  familyName,
  familySlug,
  initialTree,
}: {
  familyName: string;
  familySlug: string;
  initialTree: FamilyTreeResponse;
}) {
  const initialBranch = useMemo(
    () => createInitialBranch(initialTree),
    [initialTree],
  );
  const [rootBranch, setRootBranch] = useState<FamilyBranch>(initialBranch);
  const [selectedMemberId, setSelectedMemberId] = useState(
    initialBranch.primary.id,
  );
  const [relationshipTargetId, setRelationshipTargetId] = useState<
    string | null
  >(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletedPersonIds, setDeletedPersonIds] = useState<string[]>([]);
  const [avatarCropSource, setAvatarCropSource] = useState<File | null>(null);
  /**
   * Photos cropped but not committed yet, keyed by member. Nothing reaches the
   * media folder until "Lưu tất cả" succeeds, so an abandoned edit leaves no file.
   */
  const [pendingAvatars, setPendingAvatars] = useState<
    ReadonlyMap<string, { file: File; previewUrl: string }>
  >(() => new Map());
  /** Uploads discarded while a saved person still points at them. */
  const [pendingMediaCleanup, setPendingMediaCleanup] = useState<string[]>([]);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [savingAll, setSavingAll] = useState(false);
  /**
   * Serialised payload as of the last successful save. `null` means nothing has
   * ever been persisted, so the untouched starter card still counts as a change.
   */
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(() =>
    initialTree.people.length > 0
      ? JSON.stringify(buildDesignPayload(initialBranch, []))
      : null,
  );
  const showToast = useToast();

  const selectMember = useCallback((memberId: string): void => {
    setSelectedMemberId(memberId);
  }, []);

  const openRelationshipPicker = useCallback((memberId: string): void => {
    setSelectedMemberId(memberId);
    setRelationshipTargetId(memberId);
  }, []);

  const selectedMember = useMemo(
    () => findMember(rootBranch, selectedMemberId),
    [rootBranch, selectedMemberId],
  );
  const relationshipTarget = useMemo(
    () =>
      relationshipTargetId
        ? findMember(rootBranch, relationshipTargetId)
        : null,
    [relationshipTargetId, rootBranch],
  );
  const deleteTarget = useMemo(
    () => (deleteTargetId ? findMember(rootBranch, deleteTargetId) : null),
    [deleteTargetId, rootBranch],
  );
  const deleteRemovesBranch = useMemo(
    () =>
      deleteTargetId ? isPrimaryMember(rootBranch, deleteTargetId) : false,
    [deleteTargetId, rootBranch],
  );
  const memberCount = useMemo(() => countMembers(rootBranch), [rootBranch]);
  const selectedChildren = useMemo(
    () =>
      findBranchContainingMember(rootBranch, selectedMemberId)?.children ?? [],
    [rootBranch, selectedMemberId],
  );
  const designPayload = useMemo(
    () => buildDesignPayload(rootBranch, deletedPersonIds),
    [deletedPersonIds, rootBranch],
  );
  const hasUnsavedChanges = useMemo(
    () =>
      savedSnapshot === null ||
      pendingAvatars.size > 0 ||
      JSON.stringify(designPayload) !== savedSnapshot,
    [designPayload, pendingAvatars, savedSnapshot],
  );
  // Object URLs for crops the visitor never saved would otherwise outlive the
  // page on a client-side navigation.
  const pendingAvatarsRef = useRef(pendingAvatars);
  pendingAvatarsRef.current = pendingAvatars;
  useEffect(
    () => () =>
      pendingAvatarsRef.current.forEach((pending) =>
        URL.revokeObjectURL(pending.previewUrl),
      ),
    [],
  );

  const avatarPreviews = useMemo(
    () =>
      new Map(
        [...pendingAvatars].map(([memberId, pending]) => [
          memberId,
          pending.previewUrl,
        ]),
      ),
    [pendingAvatars],
  );
  const selectedAvatarSrc = useMemo(() => {
    const pending = pendingAvatars.get(selectedMemberId);
    if (pending) return pending.previewUrl;

    return selectedMember?.avatarUrl
      ? familyMediaSrc(familySlug, selectedMember.avatarUrl)
      : null;
  }, [familySlug, pendingAvatars, selectedMember, selectedMemberId]);
  const selectedPlacement = useMemo(
    () =>
      designPayload.people.find(
        (person) => person.clientId === selectedMemberId,
      ) ?? null,
    [designPayload, selectedMemberId],
  );

  const { nodes, edges } = useMemo(
    () =>
      createFlowElements(
        rootBranch,
        familySlug,
        avatarPreviews,
        selectedMemberId,
        selectMember,
        openRelationshipPicker,
      ),
    [
      avatarPreviews,
      familySlug,
      openRelationshipPicker,
      rootBranch,
      selectMember,
      selectedMemberId,
    ],
  );

  function addRelationship(kind: RelationshipKind): void {
    if (!relationshipTargetId || !relationshipTarget) return;

    const sourceGender = relationshipTarget.gender;
    if (relationshipChoiceBlockedReason(kind, sourceGender)) return;

    const member = createMember(relationshipGender(kind, sourceGender));
    const isSpouse = SPOUSE_KINDS.has(kind);

    setRootBranch((current) =>
      updateBranchContainingMember(current, relationshipTargetId, (branch) =>
        isSpouse
          ? { ...branch, spouses: [...branch.spouses, member] }
          : {
              ...branch,
              children: [
                ...branch.children,
                {
                  id: "branch-" + member.id,
                  primary: member,
                  spouses: [],
                  children: [],
                },
              ],
            },
      ),
    );
    setSelectedMemberId(member.id);
    setRelationshipTargetId(null);
  }

  function deleteSelectedMember(): void {
    if (!deleteTargetId || deleteTargetId === rootBranch.primary.id) {
      setDeleteTargetId(null);
      return;
    }

    const fallbackMemberId =
      deletionFallbackMemberId(rootBranch, deleteTargetId) ??
      rootBranch.primary.id;
    const removedDatabaseIds = databaseIdsRemovedByDeletion(
      rootBranch,
      deleteTargetId,
    );

    setDeletedPersonIds((current) => [
      ...new Set([...current, ...removedDatabaseIds]),
    ]);
    setRootBranch((current) => removeMember(current, deleteTargetId));
    setSelectedMemberId(fallbackMemberId);
    setDeleteTargetId(null);
  }

  function moveChild(index: number, offset: number): void {
    setRootBranch((current) =>
      updateBranchContainingMember(current, selectedMemberId, (branch) => {
        const target = index + offset;
        if (target < 0 || target >= branch.children.length) return branch;

        const children = [...branch.children];
        const [moved] = children.splice(index, 1);
        if (!moved) return branch;

        children.splice(target, 0, moved);
        return { ...branch, children };
      }),
    );
  }

  function patchSelectedMember(patch: Partial<DesignerMember>): void {
    setRootBranch((current) =>
      updateMember(current, selectedMemberId, (member) => ({
        ...member,
        ...patch,
      })),
    );
  }

  /** A death date and "còn sống" cannot both hold, so each one clears the other. */
  function patchDeathDate(value: string): void {
    patchSelectedMember(
      value ? { deathDate: value, isAlive: false } : { deathDate: value },
    );
  }

  function patchIsAlive(isAlive: boolean): void {
    patchSelectedMember(
      isAlive
        ? {
            isAlive,
            courtesyName: "",
            deathDate: "",
            lunarDeathAnniversary: "",
            burialPlace: "",
          }
        : { isAlive },
    );
  }

  function pickAvatarSource(file: File): void {
    if (
      !ACCEPTED_IMAGE_TYPES.includes(
        file.type as (typeof ACCEPTED_IMAGE_TYPES)[number],
      )
    ) {
      showToast({
        kind: "error",
        message: "Chỉ hỗ trợ ảnh định dạng JPG, PNG hoặc WEBP.",
      });
      return;
    }
    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      showToast({
        kind: "error",
        message: "Ảnh gốc vượt quá dung lượng tối đa 12 MB.",
      });
      return;
    }

    setAvatarCropSource(file);
  }

  /**
   * Drops the file behind an avatar the visitor replaced or removed. The API
   * refuses while a saved person still references it, so those are queued and
   * retried after the next successful save.
   */
  function discardAvatarFile(avatarUrl: string): void {
    if (!avatarUrl.startsWith("/media/")) return;

    void deleteFamilyMedia(familySlug, avatarUrl).catch(() => {
      setPendingMediaCleanup((current) =>
        current.includes(avatarUrl) ? current : [...current, avatarUrl],
      );
    });
  }

  function stagePendingAvatar(memberId: string, file: File | null): void {
    const previous = pendingAvatars.get(memberId);
    if (previous) URL.revokeObjectURL(previous.previewUrl);

    setPendingAvatars((current) => {
      const next = new Map(current);
      if (file)
        next.set(memberId, { file, previewUrl: URL.createObjectURL(file) });
      else next.delete(memberId);
      return next;
    });
  }

  function acceptCroppedAvatar(cropped: File): void {
    stagePendingAvatar(selectedMemberId, cropped);
    showToast({
      kind: "success",
      message: "Đã chọn ảnh. Bấm “Lưu tất cả” để ghi vào gia phả.",
    });
  }

  function removeAvatar(): void {
    const previous = selectedMember?.avatarUrl ?? "";
    stagePendingAvatar(selectedMemberId, null);
    patchSelectedMember({ avatarUrl: "" });
    if (previous) discardAvatarFile(previous);
  }

  async function saveAll(): Promise<void> {
    if (savingAll || !hasUnsavedChanges) return;

    const invalid = collectMembers(rootBranch)
      .map((member) => ({ member, message: validateMemberForSave(member) }))
      .find(
        (entry): entry is { member: DesignerMember; message: string } =>
          entry.message !== null,
      );

    if (invalid) {
      setSelectedMemberId(invalid.member.id);
      showToast({
        kind: "error",
        message:
          "Thông tin của “" +
          (invalid.member.name.trim() || "Thành viên chưa đặt tên") +
          "” chưa hợp lệ. " +
          invalid.message,
      });
      return;
    }

    setSavingAll(true);

    try {
      // Staged photos become real files only now, so an abandoned crop never
      // leaves anything behind in the media folder.
      const uploadedAvatars = new Map<string, string>();
      const replacedAvatarUrls: string[] = [];
      try {
        for (const [memberId, pending] of pendingAvatars) {
          const uploaded = await uploadFamilyMedia(familySlug, pending.file);
          uploadedAvatars.set(memberId, uploaded.url);

          const previous = findMember(rootBranch, memberId)?.avatarUrl;
          if (previous && previous !== uploaded.url) {
            replacedAvatarUrls.push(previous);
          }
        }
      } catch (uploadError: unknown) {
        showToast({
          kind: "error",
          message: getApiErrorMessage(uploadError, "tải ảnh lên"),
        });
        return;
      }

      const payload =
        uploadedAvatars.size > 0
          ? buildDesignPayload(
              applyAvatarUrls(rootBranch, uploadedAvatars),
              deletedPersonIds,
            )
          : designPayload;

      const result = await saveFamilyTreeDesign(familySlug, payload);
      const databaseIds = new Map(
        result.savedPeople.map((person) => [
          person.clientId,
          person.databaseId,
        ]),
      );

      // Snapshot what the server now holds, not the live branch: the user may
      // have kept editing while the request was in flight.
      setSavedSnapshot(
        JSON.stringify({
          people: payload.people.map((person) => ({
            ...person,
            databaseId: databaseIds.get(person.clientId) ?? person.databaseId,
          })),
          relationships: payload.relationships,
          deletedPersonIds: [],
        } satisfies FamilyTreeDesignSaveInput),
      );
      setRootBranch((current) =>
        applyDatabaseIds(
          applyAvatarUrls(current, uploadedAvatars),
          databaseIds,
        ),
      );
      setDeletedPersonIds([]);
      pendingAvatars.forEach((pending) =>
        URL.revokeObjectURL(pending.previewUrl),
      );
      setPendingAvatars(new Map());

      // Nothing saved points at these any more, so the files can go now.
      for (const avatarUrl of [...pendingMediaCleanup, ...replacedAvatarUrls]) {
        void deleteFamilyMedia(familySlug, avatarUrl).catch(() => undefined);
      }
      setPendingMediaCleanup([]);
      showToast({
        kind: "success",
        message:
          "Đã lưu toàn bộ " +
          result.savedPeople.length +
          " thành viên và " +
          result.savedRelationshipCount +
          " quan hệ.",
      });
    } catch (error: unknown) {
      showToast({
        kind: "error",
        message: getApiErrorMessage(error, "lưu toàn bộ gia phả"),
      });
    } finally {
      setSavingAll(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4efe4]">
      <header className="border-b border-emerald-950/20 bg-emerald-950 text-emerald-50 shadow-sm">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-200/15 text-amber-200 ring-1 ring-amber-100/20">
              <Network className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-serif text-xl font-semibold sm:text-2xl">
                Thiết kế gia phả
              </h1>
              <p className="truncate text-xs text-emerald-100/70">
                {familyName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full border border-amber-200/20 bg-amber-100/10 px-3 py-1.5 text-xs text-amber-100">
              Bản nháp · {memberCount} khung
            </span>
            <Button
              type="button"
              className="bg-amber-200 text-emerald-950 hover:bg-amber-100"
              disabled={savingAll || !hasUnsavedChanges}
              title={
                hasUnsavedChanges
                  ? "Lưu toàn bộ bản thiết kế"
                  : "Không có thay đổi nào cần lưu"
              }
              onClick={() => void saveAll()}
            >
              {savingAll ? (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : hasUnsavedChanges ? (
                <Save className="size-4" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              {savingAll
                ? "Đang lưu tất cả…"
                : hasUnsavedChanges
                  ? "Lưu tất cả"
                  : "Đã lưu"}
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
            >
              <Link href={"/admin/" + encodeURIComponent(familySlug)}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Quay lại quản trị
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          className="relative h-[68vh] min-h-[520px] overflow-hidden border-b border-amber-900/15 bg-[#f8f3e8] lg:h-[calc(100vh-8rem)] lg:border-b-0 lg:border-r"
          aria-label="Canvas thiết kế cây gia phả"
        >
          <ReactFlow
            key={memberCount}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
            minZoom={0.25}
            maxZoom={1.6}
            nodesDraggable={false}
            nodesConnectable={false}
            onNodeClick={(_event, node) => selectMember(node.id)}
            deleteKeyCode={null}
            proOptions={{ hideAttribution: false }}
          >
            <Background
              variant={BackgroundVariant.Lines}
              gap={32}
              size={0.7}
              color="#d8cdb8"
            />
            <Controls position="bottom-left" showInteractive={false} />
            <Panel
              position="top-left"
              className="max-w-xs rounded-xl border border-amber-900/15 bg-[#fffdf8]/90 px-3 py-2 text-xs leading-5 text-stone-600 shadow-sm backdrop-blur"
            >
              Chọn một khung để chỉnh sửa hoặc bấm “Thêm quan hệ” để mở rộng
              cây.
            </Panel>
          </ReactFlow>
        </section>

        <aside className="max-h-none overflow-y-auto bg-[#fffdf8] p-5 lg:h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                Đang chọn
              </p>
              <h2 className="mt-1 text-lg font-semibold text-emerald-950">
                Thông tin thành viên
              </h2>
            </div>
            <span
              className={cn(
                "grid size-10 place-items-center overflow-hidden rounded-full ring-1",
                selectedMember
                  ? genderStyles[selectedMember.gender]
                  : genderStyles.UNKNOWN,
              )}
            >
              {selectedAvatarSrc ? (
                // Avatars come from the API or a local crop, so next/image's
                // loader does not apply.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedAvatarSrc}
                  alt=""
                  className="size-full object-cover"
                  draggable={false}
                />
              ) : (
                <GenderAvatarFallback
                  gender={selectedMember?.gender ?? "UNKNOWN"}
                />
              )}
            </span>
          </div>

          {selectedMember ? (
            <div className="mt-5 grid gap-4">
              <DesignerTextField
                id="designer-member-name"
                label="Họ và tên"
                value={selectedMember.name}
                maxLength={191}
                onChange={(value) => patchSelectedMember({ name: value })}
              />

              <DesignerTextField
                id="designer-member-nickname"
                label="Tên thường gọi"
                value={selectedMember.nickname}
                maxLength={191}
                placeholder="Không bắt buộc"
                onChange={(value) => patchSelectedMember({ nickname: value })}
              />

              <fieldset className="grid gap-1.5">
                <legend className="text-sm font-medium text-emerald-950">
                  Giới tính
                </legend>
                <div className="mt-1.5 grid grid-cols-2 gap-3">
                  {GENDER_CHOICES.map((choice) => {
                    const isChecked = selectedMember.gender === choice.value;
                    return (
                      <label
                        key={choice.value}
                        className={cn(
                          "flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border bg-white px-3 text-sm transition",
                          isChecked
                            ? "border-emerald-700 font-medium text-emerald-950 ring-2 ring-emerald-700/15"
                            : "text-stone-600 hover:border-emerald-800/35",
                        )}
                      >
                        <input
                          type="checkbox"
                          name="designer-gender"
                          value={choice.value}
                          checked={isChecked}
                          onChange={() =>
                            patchSelectedMember({ gender: choice.value })
                          }
                          className="size-4 accent-emerald-700"
                        />
                        {choice.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <DesignerTextField
                id="designer-member-birth-date"
                label="Ngày sinh"
                type="date"
                value={selectedMember.birthDate}
                onChange={(value) => patchSelectedMember({ birthDate: value })}
              />

              <label
                className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border bg-white px-3 text-sm text-emerald-950 transition hover:border-emerald-800/35"
                htmlFor="designer-member-is-alive"
              >
                <input
                  id="designer-member-is-alive"
                  type="checkbox"
                  checked={selectedMember.isAlive}
                  onChange={(event) =>
                    patchIsAlive(event.currentTarget.checked)
                  }
                  className="size-4 accent-emerald-700"
                />
                <span className="font-medium">Còn sống</span>
              </label>

              {selectedMember.isAlive ? null : (
                <fieldset className="grid gap-4 rounded-2xl border border-amber-900/20 bg-amber-50/50 p-4">
                  <legend className="px-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                    Thông tin người đã mất
                  </legend>

                  <DesignerTextField
                    id="designer-member-courtesy-name"
                    label="Tên tự / hiệu"
                    value={selectedMember.courtesyName}
                    maxLength={191}
                    placeholder="Không bắt buộc"
                    onChange={(value) =>
                      patchSelectedMember({ courtesyName: value })
                    }
                  />

                  <DesignerTextField
                    id="designer-member-death-date"
                    label="Ngày mất"
                    type="date"
                    value={selectedMember.deathDate}
                    onChange={patchDeathDate}
                  />

                  <DeathAnniversaryPicker
                    id="designer-member-anniversary"
                    label="Ngày giỗ (âm lịch)"
                    maxDayInMonth={30}
                    value={selectedMember.lunarDeathAnniversary}
                    onChange={(value) =>
                      patchSelectedMember({ lunarDeathAnniversary: value })
                    }
                    hint="Để trống nếu chưa rõ ngày giỗ."
                  />

                  <DesignerTextField
                    id="designer-member-burial-place"
                    label="Nơi an táng"
                    value={selectedMember.burialPlace}
                    maxLength={255}
                    placeholder="Không bắt buộc"
                    onChange={(value) =>
                      patchSelectedMember({ burialPlace: value })
                    }
                  />
                </fieldset>
              )}

              <DesignerTextField
                id="designer-member-phone"
                label="Số điện thoại"
                type="tel"
                value={selectedMember.phone}
                maxLength={30}
                placeholder="Không bắt buộc"
                onChange={(value) => patchSelectedMember({ phone: value })}
              />

              <div className="grid gap-1.5">
                <span className="text-sm font-medium text-emerald-950">
                  Ảnh đại diện
                </span>
                <div className="flex items-center gap-3">
                  <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white">
                    {selectedAvatarSrc ? (
                      // Avatars come from the API or a local crop, so next/image's
                      // loader does not apply.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedAvatarSrc}
                        alt={"Ảnh đại diện của " + selectedMember.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <GenderAvatarFallback gender={selectedMember.gender} />
                    )}
                  </span>

                  <div className="grid min-w-0 flex-1 gap-2">
                    <input
                      ref={avatarInputRef}
                      id="designer-member-avatar"
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES.join(",")}
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = "";
                        if (file) pickAvatarSource(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={savingAll}
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <ImagePlus className="size-4" aria-hidden="true" />
                      {selectedAvatarSrc ? "Đổi ảnh" : "Thêm ảnh"}
                    </Button>
                    {selectedAvatarSrc ? (
                      <button
                        type="button"
                        className="text-left text-xs font-medium text-red-700 underline-offset-2 hover:underline"
                        onClick={removeAvatar}
                      >
                        Xóa ảnh đại diện
                      </button>
                    ) : (
                      <span className="text-xs text-stone-500">
                        JPG, PNG hoặc WEBP, tối đa 2 MB.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <label
                className="grid gap-1.5"
                htmlFor="designer-member-biography"
              >
                <span className="text-sm font-medium text-emerald-950">
                  Tiểu sử
                </span>
                <textarea
                  id="designer-member-biography"
                  value={selectedMember.biography}
                  onChange={(event) =>
                    patchSelectedMember({
                      biography: event.currentTarget.value,
                    })
                  }
                  rows={4}
                  maxLength={10000}
                  placeholder="Tóm tắt cuộc đời, công trạng, ghi chú của dòng họ..."
                  className="min-w-0 resize-y rounded-xl border bg-white px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                />
              </label>

              {selectedChildren.length > 0 ? (
                <fieldset className="grid gap-3 rounded-2xl border border-emerald-900/20 bg-emerald-50/50 p-4">
                  <legend className="px-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Danh sách con ({selectedChildren.length})
                  </legend>

                  <ol className="grid gap-2">
                    {selectedChildren.map((child, index) => (
                      <li
                        key={child.primary.id}
                        className="flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white p-2"
                      >
                        <span className="shrink-0 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900">
                          Thứ {index + 1}
                        </span>
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-left text-sm font-medium text-emerald-950 underline-offset-2 hover:underline"
                          title={child.primary.name}
                          onClick={() => selectMember(child.primary.id)}
                        >
                          {child.primary.name}
                        </button>
                        <span className="flex shrink-0 items-center">
                          <button
                            type="button"
                            className="grid size-8 place-items-center rounded-lg text-stone-600 transition hover:bg-stone-100 hover:text-emerald-900 disabled:pointer-events-none disabled:opacity-30"
                            disabled={index === 0}
                            aria-label={
                              "Chuyển " + child.primary.name + " lên trên"
                            }
                            onClick={() => moveChild(index, -1)}
                          >
                            <ChevronUp className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="grid size-8 place-items-center rounded-lg text-stone-600 transition hover:bg-stone-100 hover:text-emerald-900 disabled:pointer-events-none disabled:opacity-30"
                            disabled={index === selectedChildren.length - 1}
                            aria-label={
                              "Chuyển " + child.primary.name + " xuống dưới"
                            }
                            onClick={() => moveChild(index, 1)}
                          >
                            <ChevronDown
                              className="size-4"
                              aria-hidden="true"
                            />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ol>

                  <p className="text-xs leading-5 text-emerald-950/70">
                    Thứ tự này quyết định vị trí các khung con trên canvas và
                    trường thứ tự trong gia đình khi lưu.
                  </p>
                </fieldset>
              ) : null}

              <p className="rounded-xl border border-amber-900/15 bg-amber-50/70 px-3 py-2 text-xs leading-5 text-amber-950/75">
                Thế hệ {selectedPlacement?.generation ?? "-"} · Thứ tự{" "}
                {selectedPlacement?.orderInFamily ?? "-"}. Hai giá trị này do vị
                trí trên canvas quyết định.
              </p>

              <Button
                type="button"
                variant="outline"
                disabled={savingAll}
                onClick={() => openRelationshipPicker(selectedMember.id)}
              >
                <Plus className="size-4" aria-hidden="true" />
                Thêm quan hệ
              </Button>

              <Button
                type="button"
                variant="outline"
                className="border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
                disabled={
                  selectedMember.id === rootBranch.primary.id || savingAll
                }
                title={
                  selectedMember.id === rootBranch.primary.id
                    ? "Khung khởi điểm không thể xóa"
                    : "Xóa thành viên đang chọn"
                }
                onClick={() => setDeleteTargetId(selectedMember.id)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Xóa thành viên
              </Button>

              {selectedMember.id === rootBranch.primary.id ? (
                <p className="-mt-2 text-center text-xs text-stone-500">
                  Khung khởi điểm không thể xóa.
                </p>
              ) : null}

              <div className="flex gap-2 rounded-xl border border-amber-900/15 bg-amber-50 p-3 text-xs leading-5 text-amber-950/75">
                <CircleAlert
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <p>
                  Các thay đổi chỉ được ghi vào dữ liệu gia phả sau khi bạn bấm
                  “Lưu tất cả”.
                </p>
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      {relationshipTargetId ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-emerald-950/45 backdrop-blur-[2px]"
            aria-label="Đóng hộp chọn quan hệ"
            onClick={() => setRelationshipTargetId(null)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="relationship-dialog-title"
            className="relative w-full max-w-lg rounded-3xl border border-amber-900/15 bg-[#fffdf8] p-5 shadow-2xl sm:p-6"
          >
            <button
              type="button"
              className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
              onClick={() => setRelationshipTargetId(null)}
              aria-label="Đóng"
            >
              <X className="size-5" aria-hidden="true" />
            </button>

            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
              Mở rộng cây
            </p>
            <h2
              id="relationship-dialog-title"
              className="mt-2 pr-10 text-xl font-semibold text-emerald-950"
            >
              Thêm quan hệ cho {relationshipTarget?.name ?? "thành viên"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Chọn loại quan hệ. Khung vợ hoặc chồng nằm cùng hàng; khung con
              nằm ở hàng dưới.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {RELATIONSHIP_CHOICES.map((choice) => {
                const Icon = choice.icon;
                const blockedReason = relationshipTarget
                  ? relationshipChoiceBlockedReason(
                      choice.kind,
                      relationshipTarget.gender,
                    )
                  : null;
                return (
                  <button
                    key={choice.kind}
                    type="button"
                    disabled={Boolean(blockedReason)}
                    title={blockedReason ?? undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border border-amber-900/15 bg-white p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700",
                      blockedReason
                        ? "opacity-40"
                        : "hover:border-emerald-800/35 hover:bg-emerald-50",
                    )}
                    onClick={() => addRelationship(choice.kind)}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-900">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-emerald-950">
                        {choice.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-stone-500">
                        {blockedReason ?? choice.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {avatarCropSource ? (
        <ImageCropper
          file={avatarCropSource}
          onCancel={() => setAvatarCropSource(null)}
          onCropped={(cropped) => {
            setAvatarCropSource(null);
            acceptCroppedAvatar(cropped);
          }}
        />
      ) : null}

      {deleteTargetId ? (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-emerald-950/45 backdrop-blur-[2px]"
            aria-label="Đóng hộp xác nhận xóa thành viên"
            onClick={() => setDeleteTargetId(null)}
          />
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-member-dialog-title"
            aria-describedby="delete-member-dialog-description"
            className="relative w-full max-w-md rounded-3xl border border-red-900/15 bg-[#fffdf8] p-5 shadow-2xl sm:p-6"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-red-100 text-red-700">
              <Trash2 className="size-6" aria-hidden="true" />
            </span>
            <h2
              id="delete-member-dialog-title"
              className="mt-4 text-xl font-semibold text-emerald-950"
            >
              Xóa thành viên?
            </h2>
            <div
              id="delete-member-dialog-description"
              className="mt-2 space-y-2 text-sm leading-6 text-stone-600"
            >
              <p>
                Bạn có chắc muốn xóa{" "}
                <strong className="font-semibold text-stone-900">
                  {deleteTarget?.name ?? "thành viên này"}
                </strong>
                ? Thao tác này không thể hoàn tác trong bản nháp hiện tại.
              </p>
              {deleteRemovesBranch ? (
                <p className="font-medium text-red-700">
                  Các khung vợ/chồng và con thuộc nhánh này cũng sẽ bị xóa.
                </p>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTargetId(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                className="bg-red-700 text-white hover:bg-red-600 focus-visible:ring-red-700"
                onClick={deleteSelectedMember}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Xóa thành viên
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
