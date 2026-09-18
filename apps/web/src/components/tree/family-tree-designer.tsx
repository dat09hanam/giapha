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
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  saveDesignerPerson,
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
  gender: DesignerGender;
  birthYear: string;
  deathYear: string;
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

const genderStyles: Record<DesignerGender, string> = {
  MALE: "bg-sky-100 text-sky-800 ring-sky-200",
  FEMALE: "bg-rose-100 text-rose-800 ring-rose-200",
  OTHER: "bg-violet-100 text-violet-800 ring-violet-200",
  UNKNOWN: "bg-amber-50 text-amber-800 ring-amber-200",
};

function memberYears(member: DesignerMember): string {
  if (!member.birthYear && !member.deathYear) return "Chưa cập nhật năm sinh";
  return (member.birthYear || "?") + " – " + (member.deathYear || "nay");
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
            "mx-auto grid size-16 place-items-center rounded-full ring-1",
            genderStyles[data.member.gender],
            data.selected && "ring-4 ring-emerald-600/25",
          )}
        >
          <UserRound className="size-8" aria-hidden="true" />
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

function personYear(value: string | null): string {
  if (!value) return "";

  const year = new Date(value).getUTCFullYear();
  return Number.isNaN(year) ? value.slice(0, 4) : String(year);
}

function toDesignerMember(person: Person): DesignerMember {
  return {
    id: person.id,
    databaseId: person.id,
    name: person.name,
    gender: person.gender,
    birthYear: personYear(person.birthDate),
    deathYear: personYear(person.deathDate),
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
        gender: "UNKNOWN",
        birthYear: "",
        deathYear: "",
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
    gender,
    birthYear: "",
    deathYear: "",
  };
}

function editableYear(value: string): number | null {
  if (!value) return null;

  const year = Number(value);
  return Number.isInteger(year) ? year : null;
}

function yearDate(value: number | null): string | null {
  return value === null ? null : String(value).padStart(4, "0") + "-01-01";
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
      people.push({
        clientId: member.id,
        databaseId: member.databaseId,
        name: member.name.trim(),
        gender: member.gender,
        birthYear: editableYear(member.birthYear),
        deathYear: editableYear(member.deathYear),
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

  const birthYear = editableYear(member.birthYear);
  const deathYear = editableYear(member.deathYear);

  if (
    member.birthYear &&
    (birthYear === null || birthYear < 1 || birthYear > 9999)
  ) {
    return "Năm sinh phải là một năm hợp lệ.";
  }

  if (
    member.deathYear &&
    (deathYear === null || deathYear < 1 || deathYear > 9999)
  ) {
    return "Năm mất phải là một năm hợp lệ.";
  }

  if (birthYear !== null && deathYear !== null && deathYear < birthYear) {
    return "Năm mất không được nhỏ hơn năm sinh.";
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
  const [rootBranch, setRootBranch] = useState<FamilyBranch>(() =>
    createInitialBranch(initialTree),
  );
  const [selectedMemberId, setSelectedMemberId] = useState(
    () => createInitialBranch(initialTree).primary.id,
  );
  const [relationshipTargetId, setRelationshipTargetId] = useState<
    string | null
  >(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletedPersonIds, setDeletedPersonIds] = useState<string[]>([]);
  const [savingAll, setSavingAll] = useState(false);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  const selectMember = useCallback((memberId: string): void => {
    setSelectedMemberId(memberId);
    setSaveFeedback(null);
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

  const { nodes, edges } = useMemo(
    () =>
      createFlowElements(
        rootBranch,
        selectedMemberId,
        selectMember,
        openRelationshipPicker,
      ),
    [openRelationshipPicker, rootBranch, selectMember, selectedMemberId],
  );

  function addRelationship(kind: RelationshipKind): void {
    if (!relationshipTargetId) return;

    const gender: DesignerGender =
      kind === "WIFE" || kind === "DAUGHTER" ? "FEMALE" : "MALE";
    const member = createMember(gender);
    const isSpouse = kind === "WIFE" || kind === "HUSBAND";

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
    setSaveFeedback(null);
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
    setSaveFeedback(null);
    setDeleteTargetId(null);
  }

  function updateSelectedMember(
    field: Exclude<keyof DesignerMember, "id" | "databaseId">,
    value: string,
  ): void {
    setRootBranch((current) =>
      updateMember(current, selectedMemberId, (member) => ({
        ...member,
        [field]: value,
      })),
    );
    setSaveFeedback(null);
  }

  async function saveSelectedMember(): Promise<void> {
    if (!selectedMember || savingAll || savingMemberId) return;

    const validationMessage = validateMemberForSave(selectedMember);
    if (validationMessage) {
      setSaveFeedback({ kind: "error", message: validationMessage });
      return;
    }

    const payload = buildDesignPayload(rootBranch, deletedPersonIds);
    const person = payload.people.find(
      (item) => item.clientId === selectedMember.id,
    );
    if (!person) {
      setSaveFeedback({
        kind: "error",
        message: "Không tìm thấy thành viên đang chọn trong bản thiết kế.",
      });
      return;
    }

    const fatherId = person.fatherClientId
      ? (findMember(rootBranch, person.fatherClientId)?.databaseId ?? null)
      : null;
    const motherId = person.motherClientId
      ? (findMember(rootBranch, person.motherClientId)?.databaseId ?? null)
      : null;

    setSavingMemberId(selectedMember.id);
    setSaveFeedback(null);

    try {
      const savedPerson = await saveDesignerPerson(
        familySlug,
        selectedMember.databaseId,
        {
          name: person.name,
          gender: person.gender,
          birthDate: yearDate(person.birthYear),
          deathDate: yearDate(person.deathYear),
          isAlive: person.deathYear === null,
          generation: person.generation,
          orderInFamily: person.orderInFamily,
          fatherId,
          motherId,
        },
      );

      setRootBranch((current) =>
        updateMember(current, selectedMember.id, (member) => ({
          ...member,
          databaseId: savedPerson.id,
        })),
      );
      setSaveFeedback({
        kind: "success",
        message:
          "Đã lưu thành viên “" +
          person.name +
          "”. Bấm “Lưu tất cả” để đồng bộ các quan hệ.",
      });
    } catch (error: unknown) {
      setSaveFeedback({
        kind: "error",
        message: getApiErrorMessage(error, "lưu thành viên"),
      });
    } finally {
      setSavingMemberId(null);
    }
  }

  async function saveAll(): Promise<void> {
    if (savingAll || savingMemberId) return;

    const payload = buildDesignPayload(rootBranch, deletedPersonIds);
    const invalidPerson = payload.people.find(
      (person) =>
        !person.name ||
        (person.birthYear !== null &&
          (person.birthYear < 1 || person.birthYear > 9999)) ||
        (person.deathYear !== null &&
          (person.deathYear < 1 || person.deathYear > 9999)) ||
        (person.birthYear !== null &&
          person.deathYear !== null &&
          person.deathYear < person.birthYear),
    );

    if (invalidPerson) {
      setSelectedMemberId(invalidPerson.clientId);
      setSaveFeedback({
        kind: "error",
        message:
          "Thông tin của “" +
          (invalidPerson.name || "Thành viên chưa đặt tên") +
          "” chưa hợp lệ. Vui lòng kiểm tra họ tên, năm sinh và năm mất.",
      });
      return;
    }

    setSavingAll(true);
    setSaveFeedback(null);

    try {
      const result = await saveFamilyTreeDesign(familySlug, payload);
      const databaseIds = new Map(
        result.savedPeople.map((person) => [
          person.clientId,
          person.databaseId,
        ]),
      );

      setRootBranch((current) => applyDatabaseIds(current, databaseIds));
      setDeletedPersonIds([]);
      setSaveFeedback({
        kind: "success",
        message:
          "Đã lưu toàn bộ " +
          result.savedPeople.length +
          " thành viên và " +
          result.savedRelationshipCount +
          " quan hệ.",
      });
    } catch (error: unknown) {
      setSaveFeedback({
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
              disabled={savingAll || Boolean(savingMemberId)}
              onClick={() => void saveAll()}
            >
              {savingAll ? (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              {savingAll ? "Đang lưu tất cả…" : "Lưu tất cả"}
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
                "grid size-10 place-items-center rounded-full ring-1",
                selectedMember
                  ? genderStyles[selectedMember.gender]
                  : genderStyles.UNKNOWN,
              )}
            >
              <UserRound className="size-5" aria-hidden="true" />
            </span>
          </div>

          {selectedMember ? (
            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5" htmlFor="designer-member-name">
                <span className="text-sm font-medium text-emerald-950">
                  Họ và tên
                </span>
                <input
                  id="designer-member-name"
                  value={selectedMember.name}
                  onChange={(event) =>
                    updateSelectedMember("name", event.currentTarget.value)
                  }
                  maxLength={191}
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5" htmlFor="designer-birth-year">
                  <span className="text-sm font-medium text-emerald-950">
                    Năm sinh
                  </span>
                  <input
                    id="designer-birth-year"
                    value={selectedMember.birthYear}
                    onChange={(event) =>
                      updateSelectedMember(
                        "birthYear",
                        event.currentTarget.value
                          .replace(/\D/g, "")
                          .slice(0, 4),
                      )
                    }
                    inputMode="numeric"
                    placeholder="Ví dụ: 1950"
                    className="h-11 min-w-0 rounded-xl border bg-white px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                  />
                </label>
                <label className="grid gap-1.5" htmlFor="designer-death-year">
                  <span className="text-sm font-medium text-emerald-950">
                    Năm mất
                  </span>
                  <input
                    id="designer-death-year"
                    value={selectedMember.deathYear}
                    onChange={(event) =>
                      updateSelectedMember(
                        "deathYear",
                        event.currentTarget.value
                          .replace(/\D/g, "")
                          .slice(0, 4),
                      )
                    }
                    inputMode="numeric"
                    placeholder="Để trống nếu còn sống"
                    className="h-11 min-w-0 rounded-xl border bg-white px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                  />
                </label>
              </div>

              <label className="grid gap-1.5" htmlFor="designer-gender">
                <span className="text-sm font-medium text-emerald-950">
                  Giới tính
                </span>
                <select
                  id="designer-gender"
                  value={selectedMember.gender}
                  onChange={(event) =>
                    updateSelectedMember("gender", event.currentTarget.value)
                  }
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                >
                  <option value="UNKNOWN">Chưa xác định</option>
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="OTHER">Khác</option>
                </select>
              </label>

              <Button
                type="button"
                className="mt-1"
                disabled={savingAll || Boolean(savingMemberId)}
                onClick={() => void saveSelectedMember()}
              >
                {savingMemberId === selectedMember.id ? (
                  <LoaderCircle
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Save className="size-4" aria-hidden="true" />
                )}
                {savingMemberId === selectedMember.id
                  ? "Đang lưu thành viên…"
                  : "Lưu thành viên"}
              </Button>

              {saveFeedback ? (
                <div
                  role={saveFeedback.kind === "error" ? "alert" : "status"}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm leading-5",
                    saveFeedback.kind === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800",
                  )}
                >
                  {saveFeedback.message}
                </div>
              ) : null}

              <Button
                type="button"
                variant="outline"
                disabled={savingAll || Boolean(savingMemberId)}
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
                  selectedMember.id === rootBranch.primary.id ||
                  savingAll ||
                  Boolean(savingMemberId)
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
                  một trong hai nút lưu.
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
                return (
                  <button
                    key={choice.kind}
                    type="button"
                    className="flex items-center gap-3 rounded-2xl border border-amber-900/15 bg-white p-4 text-left transition hover:border-emerald-800/35 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
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
                        {choice.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
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
