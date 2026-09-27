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
  UserRound,
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
  honorific: string;
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
  fatherId: string | null;
  motherId: string | null;
  generation: number;
  orderInFamily: number;
  /** Keeps the existing delete-one-spouse/delete-descendant-branch behavior. */
  deletesBranch: boolean;
};

type DesignerRelationship = {
  husbandId: string;
  wifeId: string;
  wifeOrder: number;
};

type DesignerDraft = {
  people: DesignerMember[];
  relationships: DesignerRelationship[];
  protectedMemberId: string;
};

type RelationshipKind =
  | "FATHER"
  | "MOTHER"
  | "WIFE"
  | "HUSBAND"
  | "SON"
  | "DAUGHTER";

type RelationshipChoice = {
  kind: RelationshipKind;
  label: string;
  description: string;
  icon: LucideIcon;
};

type DesignerNodeData = {
  member: DesignerMember;
  generation: number;
  /** Resolved here because the node itself has no access to the family slug. */
  avatarSrc: string | null;
  selected: boolean;
  onSelect: (memberId: string) => void;
  onAddRelationship: (memberId: string) => void;
};

type DesignerFlowNode = Node<DesignerNodeData, "designerPerson">;

const NODE_WIDTH = 214;
const SPOUSE_GAP = 70;
const GENERATION_GAP = 260;

const RELATIONSHIP_CHOICES: RelationshipChoice[] = [
  {
    kind: "FATHER",
    label: "Bố",
    description: "Thêm bố ở thế hệ phía trên",
    icon: UserRound,
  },
  {
    kind: "MOTHER",
    label: "Mẹ",
    description: "Tạm thời chưa hỗ trợ thêm mẹ từ thành viên",
    icon: UserRound,
  },
  {
    kind: "HUSBAND",
    label: "Chồng",
    description: "Thêm một khung cùng hàng",
    icon: HeartHandshake,
  },
  {
    kind: "WIFE",
    label: "Vợ",
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

const RELATIONSHIP_CHOICE_GRID_CLASSES: Record<RelationshipKind, string> = {
  FATHER: "sm:col-start-1 sm:row-start-1",
  MOTHER: "sm:col-start-2 sm:row-start-1",
  HUSBAND: "sm:col-start-1 sm:row-start-2",
  WIFE: "sm:col-start-2 sm:row-start-2",
  SON: "sm:col-start-1 sm:row-start-3",
  DAUGHTER: "sm:col-start-2 sm:row-start-3",
};

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
  if (kind === "FATHER") return "MALE";
  if (kind === "MOTHER") return "FEMALE";

  if (SPOUSE_KINDS.has(kind)) {
    const spouseGender = oppositeGender(sourceGender);
    if (spouseGender) return spouseGender;

    return kind === "WIFE" ? "FEMALE" : "MALE";
  }

  return kind === "DAUGHTER" ? "FEMALE" : "MALE";
}

function isDaughter(member: DesignerMember): boolean {
  return (
    member.gender === "FEMALE" &&
    Boolean(member.fatherId || member.motherId)
  );
}

function relationshipChoiceIsVisible(
  kind: RelationshipKind,
  source: DesignerMember,
): boolean {
  return kind !== "HUSBAND" || !isDaughter(source);
}

function relationshipChoiceBlockedReason(
  kind: RelationshipKind,
  source: DesignerMember,
  relationships: readonly DesignerRelationship[],
): string | null {
  if (kind === "MOTHER") {
    return "Tạm thời chưa hỗ trợ thêm mẹ từ thành viên.";
  }

  if (kind === "FATHER" && source.fatherId) {
    return "Thành viên này đã có bố trong cây gia phả.";
  }

  const marriedDaughter =
    kind === "FATHER" &&
    source.gender === "FEMALE" &&
    relationships.some(
      (relationship) =>
        relationship.husbandId === source.id ||
        relationship.wifeId === source.id,
    );
  if (marriedDaughter) {
    return "Con gái đã có chồng không được thêm bố/mẹ vào nhánh gia phả này.";
  }

  const sourceGender = source.gender;
  if (kind === "HUSBAND" && isDaughter(source)) {
    return "Con gái trong dòng họ không được thêm chồng vào gia phả.";
  }

  if (kind === "HUSBAND" && sourceGender === "MALE") {
    return "Thành viên đang chọn là nam nên không thể thêm chồng.";
  }

  if (kind === "WIFE" && sourceGender === "FEMALE") {
    return "Thành viên đang chọn là nữ nên không thể thêm vợ.";
  }

  if (
    (kind === "SON" || kind === "DAUGHTER") &&
    sourceGender !== "MALE" &&
    sourceGender !== "FEMALE"
  ) {
    return "Hãy chọn giới tính Nam hoặc Nữ cho thành viên trước khi thêm con.";
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
function GenderAvatarFallback({
  gender,
  generation,
  birthDate,
}: {
  gender: DesignerGender;
  generation?: number | null;
  birthDate?: string | null;
}) {
  return (
    <>
      <PersonAvatar
        gender={gender}
        generation={generation}
        birthDate={birthDate}
        className="size-full"
      />
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
            <GenderAvatarFallback
              gender={data.member.gender}
              generation={data.generation}
              birthDate={data.member.birthDate}
            />
          )}
        </span>
        <span
          className={cn(
            "mt-3 block h-4 truncate text-center text-xs font-semibold uppercase tracking-wide",
            data.member.honorific ? "text-amber-800" : "invisible",
          )}
          title={data.member.honorific || undefined}
          aria-hidden={data.member.honorific ? undefined : true}
        >
          {data.member.honorific || "\u00a0"}
        </span>
        <span
          className="mt-1 block truncate text-center font-semibold text-emerald-950"
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
    honorific: person.honorific ?? "",
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
    fatherId: person.fatherId,
    motherId: person.motherId,
    generation: person.generation ?? 1,
    orderInFamily: person.orderInFamily ?? 1,
    deletesBranch: true,
  };
}

function sortMembers(left: DesignerMember, right: DesignerMember): number {
  return (
    left.generation - right.generation ||
    left.orderInFamily - right.orderInFamily ||
    left.name.localeCompare(right.name, "vi")
  );
}

function createMember(
  gender: DesignerGender,
  generation = 1,
  orderInFamily = 1,
): DesignerMember {
  return {
    id: globalThis.crypto.randomUUID(),
    databaseId: null,
    name: "Thành viên mới",
    honorific: "",
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
    fatherId: null,
    motherId: null,
    generation,
    orderInFamily,
    deletesBranch: true,
  };
}

function recalculateGenerations(draft: DesignerDraft): DesignerDraft {
  const peopleById = new Map(draft.people.map((person) => [person.id, person]));
  const groupParents = new Map(draft.people.map((person) => [person.id, person.id]));

  function findGroup(memberId: string): string {
    const parentId = groupParents.get(memberId) ?? memberId;
    if (parentId === memberId) return memberId;

    const rootId = findGroup(parentId);
    groupParents.set(memberId, rootId);
    return rootId;
  }

  function joinGroups(leftId: string, rightId: string): void {
    const leftRoot = findGroup(leftId);
    const rightRoot = findGroup(rightId);
    if (leftRoot !== rightRoot) groupParents.set(rightRoot, leftRoot);
  }

  draft.relationships.forEach((relationship) => {
    if (
      peopleById.has(relationship.husbandId) &&
      peopleById.has(relationship.wifeId)
    ) {
      joinGroups(relationship.husbandId, relationship.wifeId);
    }
  });

  const groupIds = new Set(draft.people.map((person) => findGroup(person.id)));
  const childGroups = new Map<string, Set<string>>();
  const indegrees = new Map([...groupIds].map((groupId) => [groupId, 0]));

  draft.people.forEach((person) => {
    const childGroup = findGroup(person.id);
    [person.fatherId, person.motherId].forEach((parentId) => {
      if (!parentId || !peopleById.has(parentId)) return;

      const parentGroup = findGroup(parentId);
      if (parentGroup === childGroup) return;

      const children = childGroups.get(parentGroup) ?? new Set<string>();
      if (children.has(childGroup)) return;

      children.add(childGroup);
      childGroups.set(parentGroup, children);
      indegrees.set(childGroup, (indegrees.get(childGroup) ?? 0) + 1);
    });
  });

  const generations = new Map<string, number>();
  const queue = [...groupIds].filter(
    (groupId) => (indegrees.get(groupId) ?? 0) === 0,
  );
  queue.forEach((groupId) => generations.set(groupId, 1));

  for (let index = 0; index < queue.length; index += 1) {
    const groupId = queue[index]!;
    const generation = generations.get(groupId) ?? 1;

    (childGroups.get(groupId) ?? new Set<string>()).forEach((childGroup) => {
      generations.set(
        childGroup,
        Math.max(generations.get(childGroup) ?? 1, generation + 1),
      );
      const remainingParents = (indegrees.get(childGroup) ?? 1) - 1;
      indegrees.set(childGroup, remainingParents);
      if (remainingParents === 0) queue.push(childGroup);
    });
  }

  groupIds.forEach((groupId) => {
    if (!generations.has(groupId)) {
      const existingGeneration = draft.people
        .filter((person) => findGroup(person.id) === groupId)
        .reduce(
          (lowest, person) => Math.min(lowest, person.generation),
          Number.MAX_SAFE_INTEGER,
        );
      generations.set(
        groupId,
        Number.isFinite(existingGeneration) ? Math.max(1, existingGeneration) : 1,
      );
    }
  });

  return {
    ...draft,
    people: draft.people.map((person) => ({
      ...person,
      generation: generations.get(findGroup(person.id)) ?? 1,
    })),
  };
}

function createInitialDraft(initialTree: FamilyTreeResponse): DesignerDraft {
  if (initialTree.people.length === 0) {
    const starter = {
      ...createMember("MALE"),
      id: "member-root",
      name: "Thành viên khởi điểm",
    };
    return { people: [starter], relationships: [], protectedMemberId: starter.id };
  }

  const sourcePeople = [...initialTree.people].sort(
    (left, right) =>
      (left.generation ?? Number.MAX_SAFE_INTEGER) -
        (right.generation ?? Number.MAX_SAFE_INTEGER) ||
      (left.orderInFamily ?? Number.MAX_SAFE_INTEGER) -
        (right.orderInFamily ?? Number.MAX_SAFE_INTEGER) ||
      left.name.localeCompare(right.name, "vi"),
  );
  const peopleById = new Map(sourcePeople.map((person) => [person.id, person]));
  const wifeIds = new Set(
    initialTree.relationships.map((relationship) => relationship.wifeId),
  );
  const visited = new Set<string>();
  const branchPrimaryIds = new Set<string>();

  function classifyBranch(primary: Person): void {
    if (visited.has(primary.id)) return;
    visited.add(primary.id);
    branchPrimaryIds.add(primary.id);

    const spousePeople = initialTree.relationships
      .filter(
        (relationship) =>
          relationship.husbandId === primary.id ||
          relationship.wifeId === primary.id,
      )
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
    sourcePeople
      .filter(
        (person) =>
          !visited.has(person.id) &&
          ((person.fatherId && parentIds.has(person.fatherId)) ||
            (person.motherId && parentIds.has(person.motherId))),
      )
      .forEach(classifyBranch);
  }

  sourcePeople
    .filter((person) => !person.fatherId && !person.motherId)
    .sort(
      (left, right) =>
        Number(wifeIds.has(left.id)) - Number(wifeIds.has(right.id)),
    )
    .forEach(classifyBranch);
  sourcePeople.forEach(classifyBranch);

  const people = sourcePeople.map((person) => ({
    ...toDesignerMember(person),
    deletesBranch: branchPrimaryIds.has(person.id),
  }));
  const protectedMember =
    people.find(
      (person) =>
        !person.fatherId && !person.motherId && !wifeIds.has(person.id),
    ) ??
    people.find((person) => !person.fatherId && !person.motherId) ??
    people[0]!;

  return recalculateGenerations({
    people,
    relationships: initialTree.relationships.map((relationship) => ({
      husbandId: relationship.husbandId,
      wifeId: relationship.wifeId,
      wifeOrder: relationship.wifeOrder ?? 1,
    })),
    protectedMemberId: protectedMember.id,
  });
}

function orderGenerationMembers(
  members: DesignerMember[],
  draft: DesignerDraft,
): DesignerMember[] {
  const membersById = new Map(members.map((member) => [member.id, member]));
  const dependentMemberIds = new Set<string>();

  draft.relationships.forEach((relationship) => {
    if (
      membersById.has(relationship.husbandId) &&
      membersById.has(relationship.wifeId)
    ) {
      dependentMemberIds.add(relationship.wifeId);
    }
  });
  draft.people.forEach((child) => {
    if (
      child.fatherId &&
      child.motherId &&
      membersById.has(child.fatherId) &&
      membersById.has(child.motherId)
    ) {
      dependentMemberIds.add(child.motherId);
    }
  });

  const visited = new Set<string>();
  const ordered: DesignerMember[] = [];
  const sortedMembers = [...members].sort(sortMembers);

  function appendMemberGroup(member: DesignerMember): void {
    if (visited.has(member.id)) return;

    ordered.push(member);
    visited.add(member.id);

    const relatedIds = new Set<string>();
    const wifeOrders = new Map<string, number>();
    draft.relationships.forEach((relationship) => {
      if (relationship.husbandId === member.id) {
        relatedIds.add(relationship.wifeId);
        wifeOrders.set(relationship.wifeId, relationship.wifeOrder);
      }
      if (relationship.wifeId === member.id) {
        relatedIds.add(relationship.husbandId);
      }
    });
    draft.people.forEach((child) => {
      if (child.fatherId === member.id && child.motherId) {
        relatedIds.add(child.motherId);
      }
      if (child.motherId === member.id && child.fatherId) {
        relatedIds.add(child.fatherId);
      }
    });

    [...relatedIds]
      .map((memberId) => membersById.get(memberId))
      .filter(
        (related): related is DesignerMember =>
          related !== undefined && !visited.has(related.id),
      )
      .sort((left, right) => {
        const leftWifeOrder = wifeOrders.get(left.id);
        const rightWifeOrder = wifeOrders.get(right.id);
        if (leftWifeOrder !== undefined || rightWifeOrder !== undefined) {
          return (
            (leftWifeOrder ?? Number.MAX_SAFE_INTEGER) -
              (rightWifeOrder ?? Number.MAX_SAFE_INTEGER) ||
            left.id.localeCompare(right.id)
          );
        }

        return sortMembers(left, right);
      })
      .forEach((related) => {
        ordered.push(related);
        visited.add(related.id);
      });
  }

  sortedMembers
    .filter((member) => !dependentMemberIds.has(member.id))
    .forEach(appendMemberGroup);
  sortedMembers.forEach(appendMemberGroup);

  return ordered;
}

function createFlowElements(
  draft: DesignerDraft,
  familySlug: string,
  avatarPreviews: ReadonlyMap<string, string>,
  selectedMemberId: string,
  onSelect: (memberId: string) => void,
  onAddRelationship: (memberId: string) => void,
): { nodes: DesignerFlowNode[]; edges: Edge[] } {
  const nodes: DesignerFlowNode[] = [];
  const edges: Edge[] = [];
  const peopleById = new Map(draft.people.map((member) => [member.id, member]));
  const generations = new Map<number, DesignerMember[]>();

  draft.people.forEach((member) => {
    const row = generations.get(member.generation) ?? [];
    row.push(member);
    generations.set(member.generation, row);
  });

  [...generations.entries()]
    .sort(([left], [right]) => left - right)
    .forEach(([generation, row]) => {
      const members = orderGenerationMembers(row, draft);
      const rowWidth =
        members.length * NODE_WIDTH +
        Math.max(0, members.length - 1) * SPOUSE_GAP;
      const left = -rowWidth / 2;

      members.forEach((member, index) => {
        const isSelected = member.id === selectedMemberId;
        nodes.push({
          id: member.id,
          type: "designerPerson",
          selected: isSelected,
          position: {
            x: left + index * (NODE_WIDTH + SPOUSE_GAP),
            y: (generation - 1) * GENERATION_GAP,
          },
          data: {
            member,
            generation,
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
      });
    });

  draft.relationships.forEach((relationship) => {
    if (
      !peopleById.has(relationship.husbandId) ||
      !peopleById.has(relationship.wifeId)
    ) {
      return;
    }
    edges.push({
      id: "spouse-" + relationship.husbandId + "-" + relationship.wifeId,
      source: relationship.husbandId,
      sourceHandle: "spouse-source",
      target: relationship.wifeId,
      targetHandle: "spouse-target",
      type: "straight",
      style: { stroke: "#9a6b2f", strokeWidth: 1.8 },
    });
  });

  draft.people.forEach((child) => {
    const parentId =
      child.fatherId && peopleById.has(child.fatherId)
        ? child.fatherId
        : child.motherId;

    if (!parentId || !peopleById.has(parentId)) return;

    edges.push({
      id: "parent-" + parentId + "-" + child.id,
      source: parentId,
      sourceHandle: "child-source",
      target: child.id,
      targetHandle: "parent-target",
      type: "smoothstep",
      style: { stroke: "#9a6b2f", strokeWidth: 1.8 },
    });
  });
  return { nodes, edges };
}

function findMember(
  draft: DesignerDraft,
  memberId: string,
): DesignerMember | null {
  return draft.people.find((member) => member.id === memberId) ?? null;
}

function updateMember(
  draft: DesignerDraft,
  memberId: string,
  update: (member: DesignerMember) => DesignerMember,
): DesignerDraft {
  return {
    ...draft,
    people: draft.people.map((member) =>
      member.id === memberId ? update(member) : member,
    ),
  };
}

function memberChildren(
  draft: DesignerDraft,
  memberId: string,
): DesignerMember[] {
  return draft.people
    .filter(
      (member) => member.fatherId === memberId || member.motherId === memberId,
    )
    .sort(sortMembers);
}

function buildDesignPayload(
  draft: DesignerDraft,
  deletedPersonIds: string[],
): FamilyTreeDesignSaveInput {
  const currentIds = new Set(draft.people.map((member) => member.id));
  return {
    people: [...draft.people].sort(sortMembers).map((member) => {
      const lunar = parseLunarAnniversary(member.lunarDeathAnniversary);
      return {
        clientId: member.id,
        databaseId: member.databaseId,
        name: member.name.trim(),
        honorific: trimmedOrNull(member.honorific),
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
        generation: member.generation,
        orderInFamily: member.orderInFamily,
        fatherClientId: member.fatherId,
        motherClientId: member.motherId,
      };
    }),
    relationships: draft.relationships
      .filter(
        (relationship) =>
          currentIds.has(relationship.husbandId) &&
          currentIds.has(relationship.wifeId),
      )
      .map((relationship) => ({
        husbandClientId: relationship.husbandId,
        wifeClientId: relationship.wifeId,
        wifeOrder: relationship.wifeOrder,
      })),
    deletedPersonIds,
  };
}

function applyDatabaseIds(
  draft: DesignerDraft,
  databaseIds: ReadonlyMap<string, string>,
): DesignerDraft {
  return {
    ...draft,
    people: draft.people.map((member) => ({
      ...member,
      databaseId: databaseIds.get(member.id) ?? member.databaseId,
    })),
  };
}

function applyAvatarUrls(
  draft: DesignerDraft,
  avatarUrls: ReadonlyMap<string, string>,
): DesignerDraft {
  return {
    ...draft,
    people: draft.people.map((member) => {
      const avatarUrl = avatarUrls.get(member.id);
      return avatarUrl ? { ...member, avatarUrl } : member;
    }),
  };
}

function collectBranchDeletionIds(
  draft: DesignerDraft,
  memberId: string,
): Set<string> {
  const member = findMember(draft, memberId);
  if (!member || !member.deletesBranch) return new Set([memberId]);

  const removedIds = new Set<string>();
  function collect(primaryId: string): void {
    if (removedIds.has(primaryId)) return;
    removedIds.add(primaryId);

    const coupleIds = new Set([primaryId]);
    draft.relationships.forEach((relationship) => {
      const spouseId =
        relationship.husbandId === primaryId
          ? relationship.wifeId
          : relationship.wifeId === primaryId
            ? relationship.husbandId
            : null;
      const spouse = spouseId ? findMember(draft, spouseId) : null;
      if (spouse && !spouse.deletesBranch) {
        coupleIds.add(spouse.id);
        removedIds.add(spouse.id);
      }
    });

    draft.people
      .filter(
        (person) =>
          (person.fatherId && coupleIds.has(person.fatherId)) ||
          (person.motherId && coupleIds.has(person.motherId)),
      )
      .forEach((child) => collect(child.id));
  }

  collect(memberId);
  return removedIds;
}

function removeMembers(
  draft: DesignerDraft,
  removedIds: ReadonlySet<string>,
): DesignerDraft {
  return recalculateGenerations({
    ...draft,
    people: draft.people
      .filter((member) => !removedIds.has(member.id))
      .map((member) => ({
        ...member,
        fatherId:
          member.fatherId && removedIds.has(member.fatherId)
            ? null
            : member.fatherId,
        motherId:
          member.motherId && removedIds.has(member.motherId)
            ? null
            : member.motherId,
      })),
    relationships: draft.relationships.filter(
      (relationship) =>
        !removedIds.has(relationship.husbandId) &&
        !removedIds.has(relationship.wifeId),
    ),
  });
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
  const initialDraft = useMemo(
    () => createInitialDraft(initialTree),
    [initialTree],
  );
  const [draft, setDraft] = useState<DesignerDraft>(initialDraft);
  const [selectedMemberId, setSelectedMemberId] = useState(
    initialDraft.protectedMemberId,
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
      ? JSON.stringify(buildDesignPayload(initialDraft, []))
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
    () => findMember(draft, selectedMemberId),
    [draft, selectedMemberId],
  );
  const relationshipTarget = useMemo(
    () =>
      relationshipTargetId ? findMember(draft, relationshipTargetId) : null,
    [draft, relationshipTargetId],
  );
  const deleteTarget = useMemo(
    () => (deleteTargetId ? findMember(draft, deleteTargetId) : null),
    [deleteTargetId, draft],
  );
  const deleteAffectedIds = useMemo(
    () =>
      deleteTargetId
        ? collectBranchDeletionIds(draft, deleteTargetId)
        : new Set<string>(),
    [deleteTargetId, draft],
  );
  const deleteRemovesBranch = deleteAffectedIds.size > 1;
  const deleteDetachesChildren =
    !deleteRemovesBranch &&
    Boolean(deleteTargetId && memberChildren(draft, deleteTargetId).length > 0);
  const memberCount = draft.people.length;
  const selectedChildren = useMemo(
    () => memberChildren(draft, selectedMemberId),
    [draft, selectedMemberId],
  );
  const designPayload = useMemo(
    () => buildDesignPayload(draft, deletedPersonIds),
    [deletedPersonIds, draft],
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
        draft,
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
      draft,
      selectMember,
      selectedMemberId,
    ],
  );

  function addRelationship(kind: RelationshipKind): void {
    if (!relationshipTargetId || !relationshipTarget) return;
    if (
      relationshipChoiceBlockedReason(
        kind,
        relationshipTarget,
        draft.relationships,
      )
    )
      return;

    const member = createMember(
      relationshipGender(kind, relationshipTarget.gender),
      kind === "FATHER"
        ? Math.max(1, relationshipTarget.generation - 1)
        : kind === "SON" || kind === "DAUGHTER"
          ? relationshipTarget.generation + 1
          : relationshipTarget.generation,
      relationshipTarget.orderInFamily,
    );
    const memberForDraft = {
      ...member,
      deletesBranch: kind !== "FATHER" && !SPOUSE_KINDS.has(kind),
    };

    setDraft((current) => {
      const target = findMember(current, relationshipTargetId);
      if (
        !target ||
        relationshipChoiceBlockedReason(kind, target, current.relationships)
      )
        return current;

      if (kind === "FATHER") {
        const withParent = updateMember(
          { ...current, people: [...current.people, memberForDraft] },
          target.id,
          (person) => ({ ...person, fatherId: member.id }),
        );
        return recalculateGenerations(withParent);
      }

      if (SPOUSE_KINDS.has(kind)) {
        const wifeOrder =
          Math.max(
            0,
            ...current.relationships
              .filter(
                (relationship) =>
                  relationship.husbandId === target.id ||
                  relationship.wifeId === target.id,
              )
              .map((relationship) => relationship.wifeOrder),
          ) + 1;
        const relationship: DesignerRelationship =
          kind === "WIFE"
            ? { husbandId: target.id, wifeId: member.id, wifeOrder }
            : { husbandId: member.id, wifeId: target.id, wifeOrder };

        return recalculateGenerations({
          ...current,
          people: [...current.people, memberForDraft],
          relationships: [...current.relationships, relationship],
        });
      }

      const spouseIds = current.relationships.flatMap((relationship) => {
        if (relationship.husbandId === target.id) return [relationship.wifeId];
        if (relationship.wifeId === target.id) return [relationship.husbandId];
        return [];
      });
      const spouse = current.people.find(
        (person) =>
          spouseIds.includes(person.id) && person.gender !== target.gender,
      );
      const siblings = memberChildren(current, target.id);
      const child = {
        ...member,
        orderInFamily:
          Math.max(0, ...siblings.map((sibling) => sibling.orderInFamily)) + 1,
        fatherId: target.gender === "MALE" ? target.id : spouse?.id ?? null,
        motherId: target.gender === "FEMALE" ? target.id : spouse?.id ?? null,
      };

      return recalculateGenerations({
        ...current,
        people: [...current.people, child],
      });
    });
    setSelectedMemberId(member.id);
    setRelationshipTargetId(null);
  }

  function deleteSelectedMember(): void {
    if (
      !deleteTargetId ||
      !deleteTarget ||
      deleteTargetId === draft.protectedMemberId
    ) {
      setDeleteTargetId(null);
      return;
    }

    const removedIds = collectBranchDeletionIds(draft, deleteTargetId);
    const spouseId = draft.relationships
      .flatMap((relationship) => {
        if (relationship.husbandId === deleteTargetId) return [relationship.wifeId];
        if (relationship.wifeId === deleteTargetId) return [relationship.husbandId];
        return [];
      })
      .find(
        (memberId) =>
          !removedIds.has(memberId) && Boolean(findMember(draft, memberId)),
      );
    const fallbackMemberId =
      [deleteTarget.fatherId, deleteTarget.motherId, spouseId].find(
        (memberId): memberId is string =>
          Boolean(memberId && !removedIds.has(memberId)),
      ) ?? draft.protectedMemberId;
    const removedDatabaseIds = draft.people
      .filter((member) => removedIds.has(member.id))
      .map((member) => member.databaseId)
      .filter((databaseId): databaseId is string => Boolean(databaseId));

    setDeletedPersonIds((current) => [
      ...new Set([...current, ...removedDatabaseIds]),
    ]);
    setDraft((current) =>
      removeMembers(
        current,
        collectBranchDeletionIds(current, deleteTargetId),
      ),
    );
    setSelectedMemberId(fallbackMemberId);
    setDeleteTargetId(null);
  }

  function moveChild(index: number, offset: number): void {
    setDraft((current) => {
      const children = memberChildren(current, selectedMemberId);
      const targetIndex = index + offset;
      if (targetIndex < 0 || targetIndex >= children.length) return current;

      const ordered = [...children];
      const [moved] = ordered.splice(index, 1);
      if (!moved) return current;
      ordered.splice(targetIndex, 0, moved);
      const orders = new Map(
        ordered.map((child, childIndex) => [child.id, childIndex + 1]),
      );

      return {
        ...current,
        people: current.people.map((person) => ({
          ...person,
          orderInFamily: orders.get(person.id) ?? person.orderInFamily,
        })),
      };
    });
  }

  function patchSelectedMember(patch: Partial<DesignerMember>): void {
    setDraft((current) =>
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

    const invalid = draft.people
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

          const previous = findMember(draft, memberId)?.avatarUrl;
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
            applyAvatarUrls(draft, uploadedAvatars),
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
      setDraft((current) =>
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
                  generation={selectedPlacement?.generation}
                  birthDate={selectedMember?.birthDate}
                />
              )}
            </span>
          </div>

          {selectedMember ? (
            <div className="mt-5 grid gap-4">
              <DesignerTextField
                id="designer-member-honorific"
                label="Danh xưng"
                value={selectedMember.honorific}
                maxLength={100}
                placeholder="Ví dụ: Cụ tổ, Cụ, Ông, Bà..."
                onChange={(value) => patchSelectedMember({ honorific: value })}
              />

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
                      <GenderAvatarFallback
                        gender={selectedMember.gender}
                        generation={selectedPlacement?.generation}
                        birthDate={selectedMember.birthDate}
                      />
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
                        key={child.id}
                        className="flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white p-2"
                      >
                        <span className="shrink-0 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900">
                          Thứ {index + 1}
                        </span>
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-left text-sm font-medium text-emerald-950 underline-offset-2 hover:underline"
                          title={child.name}
                          onClick={() => selectMember(child.id)}
                        >
                          {child.name}
                        </button>
                        <span className="flex shrink-0 items-center">
                          <button
                            type="button"
                            className="grid size-8 place-items-center rounded-lg text-stone-600 transition hover:bg-stone-100 hover:text-emerald-900 disabled:pointer-events-none disabled:opacity-30"
                            disabled={index === 0}
                            aria-label={
                              "Chuyển " + child.name + " lên trên"
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
                              "Chuyển " + child.name + " xuống dưới"
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
                  selectedMember.id === draft.protectedMemberId || savingAll
                }
                title={
                  selectedMember.id === draft.protectedMemberId
                    ? "Khung khởi điểm không thể xóa"
                    : "Xóa thành viên đang chọn"
                }
                onClick={() => setDeleteTargetId(selectedMember.id)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Xóa thành viên
              </Button>

              {selectedMember.id === draft.protectedMemberId ? (
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
              Chọn loại quan hệ. Bố/mẹ nằm ở thế hệ phía trên; vợ/chồng
              nằm cùng hàng và con nằm ở hàng dưới.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {RELATIONSHIP_CHOICES.filter(
                (choice) =>
                  !relationshipTarget ||
                  relationshipChoiceIsVisible(choice.kind, relationshipTarget),
              ).map((choice) => {
                const Icon = choice.icon;
                const blockedReason = relationshipTarget
                  ? relationshipChoiceBlockedReason(
                    choice.kind,
                    relationshipTarget,
                    draft.relationships,
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
                      RELATIONSHIP_CHOICE_GRID_CLASSES[choice.kind],
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
                  Các khung vợ/chồng và con cháu thuộc nhánh này cũng sẽ bị xóa.
                </p>
              ) : deleteDetachesChildren ? (
                <p className="font-medium text-amber-700">
                  Các thành viên con sẽ được giữ lại và bỏ liên kết với người này.
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
