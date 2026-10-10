'use client';

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Panel,
  Position,
  ReactFlow,
  type Node,
  type NodeProps,
  type NodeTypes,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Camera,
  ArrowLeft,
  Baby,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ImagePlus,
  Info,
  MessageSquareQuote,
  HeartHandshake,
  Lock,
  Network,
  PencilLine,
  Plus,
  Save,
  Scan,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';

import { InlineLoader } from '@/components/ui/heritage-loader';
import { BottomTab } from '@/components/layout/family-header';
import { EditorSection, EditorTabs, FieldHint } from '@/components/tree/member-editor-layout';
import { MemberPicker } from '@/components/tree/member-picker';
import { familyEdgeTypes } from '@/components/tree/family-link-edge';
import { Button } from '@/components/ui/button';
import { CameraCapture } from '@/components/ui/camera-capture';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Segmented } from '@/components/ui/segmented';
import { PartialDatePicker } from '@/components/ui/partial-date-picker';
import { canChiYear } from '@/lib/han-viet';
import { yearOf, formatPartialDate } from '@/lib/partial-date';
import { ImageCropper } from '@/components/ui/image-cropper';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { Presence, usePresence } from '@/components/ui/presence';
import { useToast } from '@/components/ui/toast';
import { DeathAnniversaryPicker } from '@/components/ui/death-anniversary-picker';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_SOURCE_IMAGE_BYTES,
  deleteFamilyMedia,
  familyMediaSrc,
  uploadFamilyMedia,
} from '@/lib/media-api';
import { updateEditSuggestionStatus } from '@/lib/edit-suggestion-api';
import { computeBranchScope, type BranchScope, type TreeEditScope } from '@/lib/branch-scope';
import { saveFamilyTreeDesign, type FamilyTreeDesignSaveInput } from '@/lib/family-tree-design-api';
import { computeGenerations, layoutFamily, type LayoutDimensions } from '@/lib/family-layout';
import { familyEdges, type FamilyEdge } from '@/lib/tree-layout';
import { cn } from '@/lib/utils';
import type { EditSuggestion } from '@/types/edit-suggestion';
import type { FamilyTreeResponse, MaritalStatus, Person } from '@/types/family-tree';

import {
  findMember,
  sortMembers,
  type DesignerDraft,
  type DesignerGender,
  type DesignerMember,
} from './designer-model';
import {
  findDuplicatePair,
  husbandsOf,
  isChildKind,
  needsMotherChoice,
  nextWifeOrder,
  plannedChildParents,
  relationshipChoiceBlockedReason,
  relationshipGender,
  wivesOf,
  type PlannedParents,
  type RelationshipKind,
} from './designer-relationship-rules';

type RelationshipChoice = {
  kind: RelationshipKind;
  label: string;
  description: string;
  icon: LucideIcon;
};

type AdditionState = { step: 'choose' } | { step: 'mother'; kind: RelationshipKind };

type DesignerNodeData = {
  member: DesignerMember;
  generation: number;
  spouseLabel: string | null;
  avatarSrc: string | null;
  selected: boolean;
  editable: boolean;
  onSelect: (memberId: string) => void;
  onAddRelationship: (memberId: string) => void;
};

type DesignerFlowNode = Node<DesignerNodeData, 'designerPerson'>;

const RELATIONSHIP_CHOICES: RelationshipChoice[] = [
  {
    kind: 'FATHER',
    label: 'Thêm bố',
    description: 'Thế hệ phía trên',
    icon: UserRound,
  },
  {
    kind: 'MOTHER',
    label: 'Thêm mẹ',
    description: 'Thế hệ phía trên',
    icon: UserRound,
  },
  {
    kind: 'WIFE',
    label: 'Thêm vợ',
    description: 'Cùng hàng, tự đánh số Vợ 1, Vợ 2…',
    icon: HeartHandshake,
  },
  {
    kind: 'SON',
    label: 'Thêm con trai',
    description: 'Hàng phía dưới',
    icon: Baby,
  },
  {
    kind: 'DAUGHTER',
    label: 'Thêm con gái',
    description: 'Hàng phía dưới',
    icon: Baby,
  },
];

const RELATIONSHIP_CHOICE_GRID_CLASSES: Record<RelationshipKind, string> = {
  FATHER: 'sm:col-start-1 sm:row-start-1',
  MOTHER: 'sm:col-start-2 sm:row-start-1',
  WIFE: 'sm:col-span-2 sm:row-start-2',
  SON: 'sm:col-start-1 sm:row-start-3',
  DAUGHTER: 'sm:col-start-2 sm:row-start-3',
};

const GENDER_CHOICES: ReadonlyArray<{ value: DesignerGender; label: string }> = [
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
];

const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  SINGLE: 'Độc thân',
  MARRIED: 'Đã kết hôn',
  DIVORCED: 'Ly hôn',
  WIDOWED: 'Goá',
};

const LUNAR_MONTH_NAMES = [
  'Giêng',
  'Hai',
  'Ba',
  'Tư',
  'Năm',
  'Sáu',
  'Bảy',
  'Tám',
  'Chín',
  'Mười',
  'Một',
  'Chạp',
] as const;

const LIFE_CHOICES: ReadonlyArray<{ value: 'ALIVE' | 'DECEASED'; label: string }> = [
  { value: 'ALIVE', label: 'Còn sống' },
  { value: 'DECEASED', label: 'Đã mất' },
];

const genderStyles: Record<DesignerGender, string> = {
  MALE: 'bg-sky-100 text-sky-800 ring-sky-200',
  FEMALE: 'bg-rose-100 text-rose-800 ring-rose-200',
  OTHER: 'bg-violet-100 text-violet-800 ring-violet-200',
  UNKNOWN: 'bg-amber-50 text-amber-800 ring-amber-200',
};

const genderLabels: Record<DesignerGender, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Giới tính khác',
  UNKNOWN: 'Chưa xác định giới tính',
};

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
  const bornIn = yearOf(member.birthDate)?.toString() ?? '';
  const deathYear = yearOf(member.deathDate)?.toString() ?? '';
  if (!bornIn && !deathYear) return 'Chưa cập nhật năm sinh';

  const end = deathYear || (member.isAlive ? 'nay' : '?');
  return (bornIn || '?') + ' – ' + end;
}

function DesignerPersonNode({ data }: NodeProps<DesignerFlowNode>) {
  return (
    <article
      aria-current={data.selected ? 'true' : undefined}
      className={cn(
        'relative w-[214px] overflow-hidden rounded-xl border border-gold-500/30 bg-[var(--card)] shadow-lg shadow-wood-950/10 transition duration-200',
        data.selected
          ? 'scale-[1.03] border-brand-700 bg-brand-50 shadow-2xl shadow-brand-950/25 ring-4 ring-brand-500/30'
          : 'border-amber-900/20 hover:border-amber-700/45',
        !data.editable && !data.selected && 'opacity-60',
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
      {data.spouseLabel ? (
        <span className="absolute left-3 top-3 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
          {data.spouseLabel}
        </span>
      ) : null}

      <button
        type="button"
        className="block w-full px-4 pb-3 pt-4 text-left"
        onClick={() => data.onSelect(data.member.id)}
        aria-pressed={data.selected}
      >
        <span
          className={cn(
            'mx-auto grid size-16 place-items-center overflow-hidden rounded-full ring-1',
            genderStyles[data.member.gender],
            data.selected && 'ring-4 ring-brand-600/25',
          )}
        >
          {data.avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.avatarSrc} alt="" className="size-full object-cover" draggable={false} />
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
            'mt-3 block h-4 truncate text-center text-xs font-semibold uppercase tracking-wide',
            data.member.honorific ? 'text-amber-800' : 'invisible',
          )}
          title={data.member.honorific || undefined}
          aria-hidden={data.member.honorific ? undefined : true}
        >
          {data.member.honorific || '\u00a0'}
        </span>
        <span
          className="mt-1 block truncate text-center font-semibold text-brand-950"
          title={data.member.name}
        >
          {data.member.name}
        </span>
        <span className="mt-1 block text-center text-xs text-stone-500">
          {memberYears(data.member)}
        </span>
      </button>

      {data.editable ? (
        <button
          type="button"
          className={cn(
            'flex w-full items-center justify-center gap-1.5 border-t border-amber-900/10 px-3 py-2.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-700',
            data.selected ? 'bg-brand-100/80 text-brand-950' : 'bg-amber-50/70',
          )}
          onClick={(event) => {
            event.stopPropagation();
            data.onAddRelationship(data.member.id);
          }}
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Thêm quan hệ
        </button>
      ) : (
        <p className="border-t border-amber-900/10 bg-stone-50 px-3 py-2.5 text-center text-xs text-stone-500">
          Ngoài chi bạn quản lý
        </p>
      )}

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
      <Handle
        id="bracket-target"
        type="target"
        position={Position.Bottom}
        className="!size-0 !border-0 !bg-transparent"
      />
    </article>
  );
}

const nodeTypes = { designerPerson: DesignerPersonNode } satisfies NodeTypes;

function lunarAnniversaryInput(day: number | null, month: number | null): string {
  if (!day || !month) return '';
  return String(day).padStart(2, '0') + '/' + String(month).padStart(2, '0');
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
    honorific: person.honorific ?? '',
    nickname: person.nickname ?? '',
    courtesyName: person.courtesyName ?? '',
    gender: person.gender,
    birthDate: formatPartialDate(person.birthDate),
    deathDate: formatPartialDate(person.deathDate),
    lunarDeathAnniversary: lunarAnniversaryInput(person.lunarDeathDay, person.lunarDeathMonth),
    isAlive: person.isAlive,
    burialPlace: person.burialPlace ?? '',
    phone: person.phone ?? '',
    avatarUrl: person.avatarUrl ?? '',
    biography: person.biography ?? '',
    fatherId: person.fatherId,
    motherId: person.motherId,
    maritalStatus: person.maritalStatus ?? '',
    education: person.education ?? '',
    occupation: person.occupation ?? '',
    hometown: person.hometown ?? '',
    currentAddress: person.currentAddress ?? '',
    mapUrl: person.mapUrl ?? '',
    ageAtDeath: person.ageAtDeath?.toString() ?? '',
    worshipPlace: person.worshipPlace ?? '',
    worshipKeeperId: person.worshipKeeperId ?? '',
    deathAnniversaryText: person.deathAnniversaryText ?? '',
    generation: person.generation ?? 1,
    orderInFamily: person.orderInFamily ?? 1,
    deletesBranch: true,
  };
}

function createMember(gender: DesignerGender, generation = 1, orderInFamily = 1): DesignerMember {
  return {
    id: globalThis.crypto.randomUUID(),
    databaseId: null,
    name: 'Thành viên mới',
    honorific: '',
    nickname: '',
    courtesyName: '',
    gender,
    birthDate: '',
    deathDate: '',
    lunarDeathAnniversary: '',
    isAlive: true,
    burialPlace: '',
    phone: '',
    avatarUrl: '',
    biography: '',
    fatherId: null,
    motherId: null,
    maritalStatus: '',
    education: '',
    occupation: '',
    hometown: '',
    currentAddress: '',
    mapUrl: '',
    ageAtDeath: '',
    worshipPlace: '',
    worshipKeeperId: '',
    deathAnniversaryText: '',
    generation,
    orderInFamily,
    deletesBranch: true,
  };
}

function nextMemberName(people: readonly DesignerMember[]): string {
  const names = new Set(people.map((person) => person.name));
  let number = people.length + 1;
  while (names.has(`Thành viên thứ ${number}`)) number += 1;
  return `Thành viên thứ ${number}`;
}

function recalculateGenerations(draft: DesignerDraft): DesignerDraft {
  const generations = computeGenerations(draft.people, draft.relationships);
  return {
    ...draft,
    people: draft.people.map((person) => ({
      ...person,
      generation: generations.get(person.id) ?? 1,
    })),
  };
}

function createInitialDraft(initialTree: FamilyTreeResponse): DesignerDraft {
  if (initialTree.people.length === 0) {
    const starter = {
      ...createMember('MALE'),
      id: 'member-root',
      name: 'Thành viên khởi điểm',
    };
    return { people: [starter], relationships: [], protectedMemberId: starter.id };
  }

  const sourcePeople = [...initialTree.people].sort(
    (left, right) =>
      (left.generation ?? Number.MAX_SAFE_INTEGER) -
        (right.generation ?? Number.MAX_SAFE_INTEGER) ||
      (left.orderInFamily ?? Number.MAX_SAFE_INTEGER) -
        (right.orderInFamily ?? Number.MAX_SAFE_INTEGER) ||
      left.name.localeCompare(right.name, 'vi'),
  );
  const peopleById = new Map(sourcePeople.map((person) => [person.id, person]));
  const wifeIds = new Set(initialTree.relationships.map((relationship) => relationship.wifeId));
  const visited = new Set<string>();
  const branchPrimaryIds = new Set<string>();

  function classifyBranch(primary: Person): void {
    if (visited.has(primary.id)) return;
    visited.add(primary.id);
    branchPrimaryIds.add(primary.id);

    const spousePeople = initialTree.relationships
      .filter(
        (relationship) =>
          relationship.husbandId === primary.id || relationship.wifeId === primary.id,
      )
      .map((relationship) =>
        peopleById.get(
          relationship.husbandId === primary.id ? relationship.wifeId : relationship.husbandId,
        ),
      )
      .filter((person): person is Person => person !== undefined && !visited.has(person.id));
    spousePeople.forEach((person) => visited.add(person.id));

    const parentIds = new Set([primary.id, ...spousePeople.map((person) => person.id)]);
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
    .sort((left, right) => Number(wifeIds.has(left.id)) - Number(wifeIds.has(right.id)))
    .forEach(classifyBranch);
  sourcePeople.forEach(classifyBranch);

  const people = sourcePeople.map((person) => ({
    ...toDesignerMember(person),
    deletesBranch: branchPrimaryIds.has(person.id),
  }));
  const protectedMember =
    people.find((person) => !person.fatherId && !person.motherId && !wifeIds.has(person.id)) ??
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

const DESIGNER_DIMENSIONS: LayoutDimensions = {
  nodeWidth: 214,
  spouseGap: 70,
  siblingGap: 48,
  generationGap: 320,
};

const LINK_STYLE = { stroke: '#9a6b2f', strokeWidth: 1.8 };

function spouseLabels(draft: DesignerDraft): Map<string, string> {
  const labels = new Map<string, string>();
  new Set(draft.relationships.map((relationship) => relationship.husbandId)).forEach(
    (husbandId) => {
      const wives = wivesOf(draft, husbandId);
      if (wives.length < 2) return;
      wives.forEach((wife, index) => labels.set(wife.member.id, 'Vợ ' + (index + 1)));
    },
  );
  return labels;
}

function createFlowElements(
  draft: DesignerDraft,
  familySlug: string,
  avatarPreviews: ReadonlyMap<string, string>,
  selectedMemberId: string,
  editableIds: ReadonlySet<string> | null,
  onSelect: (memberId: string) => void,
  onAddRelationship: (memberId: string) => void,
): { nodes: DesignerFlowNode[]; edges: FamilyEdge[] } {
  const layout = layoutFamily(draft, DESIGNER_DIMENSIONS);
  const labels = spouseLabels(draft);

  const nodes: DesignerFlowNode[] = draft.people.map((member) => {
    const isSelected = member.id === selectedMemberId;
    return {
      id: member.id,
      type: 'designerPerson',
      selected: isSelected,
      position: layout.positions.get(member.id) ?? { x: 0, y: 0 },
      data: {
        member,
        generation: member.generation,
        spouseLabel: labels.get(member.id) ?? null,
        avatarSrc:
          avatarPreviews.get(member.id) ??
          (member.avatarUrl ? familyMediaSrc(familySlug, member.avatarUrl) : null),
        selected: isSelected,
        editable: !editableIds || editableIds.has(member.id),
        onSelect,
        onAddRelationship,
      },
    };
  });

  return { nodes, edges: familyEdges(layout, LINK_STYLE) };
}

function updateMember(
  draft: DesignerDraft,
  memberId: string,
  update: (member: DesignerMember) => DesignerMember,
): DesignerDraft {
  return {
    ...draft,
    people: draft.people.map((member) => (member.id === memberId ? update(member) : member)),
  };
}

function withMarriage(draft: DesignerDraft, husbandId: string, wifeId: string): DesignerDraft {
  if (
    draft.relationships.some(
      (relationship) => relationship.husbandId === husbandId && relationship.wifeId === wifeId,
    )
  ) {
    return draft;
  }
  return {
    ...draft,
    relationships: [
      ...draft.relationships,
      { husbandId, wifeId, wifeOrder: nextWifeOrder(draft, husbandId) },
    ],
  };
}

function memberChildren(draft: DesignerDraft, memberId: string): DesignerMember[] {
  return draft.people
    .filter((member) => member.fatherId === memberId || member.motherId === memberId)
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
        maritalStatus: member.maritalStatus || null,
        education: trimmedOrNull(member.education),
        occupation: trimmedOrNull(member.occupation),
        hometown: trimmedOrNull(member.hometown),
        currentAddress: trimmedOrNull(member.currentAddress),
        mapUrl: trimmedOrNull(member.mapUrl),
        ageAtDeath: member.ageAtDeath ? Number(member.ageAtDeath) : null,
        worshipPlace: trimmedOrNull(member.worshipPlace),
        worshipKeeperClientId:
          member.worshipKeeperId && currentIds.has(member.worshipKeeperId)
            ? member.worshipKeeperId
            : null,
        deathAnniversaryText: trimmedOrNull(member.deathAnniversaryText),
      };
    }),
    relationships: draft.relationships
      .filter(
        (relationship) =>
          currentIds.has(relationship.husbandId) && currentIds.has(relationship.wifeId),
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

function collectBranchDeletionIds(draft: DesignerDraft, memberId: string): Set<string> {
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

function removeMembers(draft: DesignerDraft, removedIds: ReadonlySet<string>): DesignerDraft {
  return recalculateGenerations({
    ...draft,
    people: draft.people
      .filter((member) => !removedIds.has(member.id))
      .map((member) => ({
        ...member,
        fatherId: member.fatherId && removedIds.has(member.fatherId) ? null : member.fatherId,
        motherId: member.motherId && removedIds.has(member.motherId) ? null : member.motherId,
      })),
    relationships: draft.relationships.filter(
      (relationship) =>
        !removedIds.has(relationship.husbandId) && !removedIds.has(relationship.wifeId),
    ),
  });
}

const fieldClassName =
  'h-11 min-w-0 rounded-xl border bg-white px-3 text-base sm:text-sm outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15';

function childRole(children: readonly DesignerMember[], child: DesignerMember): string {
  if (child.gender === 'FEMALE') return 'Con gái';
  if (child.gender !== 'MALE') return 'Con';
  return children.find((entry) => entry.gender === 'MALE')?.id === child.id
    ? 'Con trưởng'
    : 'Con trai';
}

function computedAgeAtDeath(member: DesignerMember): number | null {
  const bornIn = yearOf(member.birthDate);
  const diedIn = yearOf(member.deathDate);
  return bornIn === null || diedIn === null || diedIn < bornIn ? null : diedIn - bornIn;
}

function anniversaryText(member: DesignerMember): string {
  const { day, month } = parseLunarAnniversary(member.lunarDeathAnniversary);
  if (!day || !month) return '';
  const diedIn = yearOf(member.deathDate);
  const date = `${day <= 10 ? 'Mùng ' + day : day} tháng ${LUNAR_MONTH_NAMES[month - 1]}`;
  return diedIn === null ? date : `${date} năm ${canChiYear(diedIn)}`;
}

function CountBadge({ count }: { count: number }) {
  return count > 0 ? (
    <span className="grid h-6 min-w-6 place-items-center rounded-full bg-gold-100 px-1.5 text-xs font-semibold tabular-nums text-wood-700">
      {count}
    </span>
  ) : null;
}

function RelativeRow({
  member,
  role,
  order,
  onOpen,
  onMove,
}: {
  member: DesignerMember;
  role: string;
  order?: number;
  onOpen: () => void;
  onMove?: { up: (() => void) | null; down: (() => void) | null };
}) {
  const name = member.name.trim() || 'Chưa đặt tên';
  return (
    <li className="flex items-center gap-2.5 rounded-xl border border-gold-500/25 bg-white p-2.5">
      <span className="relative shrink-0">
        <span
          className={cn(
            'grid size-9 place-items-center rounded-full text-sm font-semibold ring-1',
            genderStyles[member.gender],
          )}
          aria-hidden="true"
        >
          {member.name.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() || '?'}
        </span>
        {order === undefined ? null : (
          <span
            className="absolute -left-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-700 px-1 text-[11px] font-semibold tabular-nums text-white ring-2 ring-white"
            aria-label={'Thứ ' + order}
          >
            {order}
          </span>
        )}
      </span>
      <span className="grid min-w-0 flex-1 gap-1">
        <button
          type="button"
          className="line-clamp-2 wrap-break-word text-left text-sm font-semibold leading-5 text-brand-950 underline-offset-2 hover:underline"
          title={name}
          onClick={onOpen}
        >
          {name}
        </button>
        <span className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
          <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-medium text-stone-700">
            {role}
          </span>
          {memberYears(member)}
        </span>
      </span>
      {onMove ? (
        <span className="flex shrink-0 flex-col">
          <button
            type="button"
            className="grid size-7 place-items-center rounded-lg text-stone-600 transition hover:bg-stone-100 hover:text-brand-900 disabled:pointer-events-none disabled:opacity-30"
            disabled={!onMove.up}
            aria-label={'Chuyển ' + name + ' lên trên'}
            onClick={() => onMove.up?.()}
          >
            <ChevronUp className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="grid size-7 place-items-center rounded-lg text-stone-600 transition hover:bg-stone-100 hover:text-brand-900 disabled:pointer-events-none disabled:opacity-30"
            disabled={!onMove.down}
            aria-label={'Chuyển ' + name + ' xuống dưới'}
            onClick={() => onMove.down?.()}
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
        </span>
      ) : null}
    </li>
  );
}

function DesignerTextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  maxLength,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'partialDate' | 'tel' | 'url';
  maxLength?: number;
  placeholder?: string;
}) {
  if (type === 'partialDate') {
    return (
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-brand-950" htmlFor={id}>
          {label}
        </label>
        <PartialDatePicker
          id={id}
          title={label}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <label className="grid gap-1.5" htmlFor={id}>
      <span className="text-sm font-medium text-brand-950">{label}</span>
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
  if (!member.name.trim()) return 'Vui lòng nhập họ và tên thành viên.';

  const bornIn = yearOf(member.birthDate);
  const diedIn = yearOf(member.deathDate);
  if (bornIn !== null && diedIn !== null && diedIn < bornIn) {
    return 'Năm mất không được trước năm sinh.';
  }

  return null;
}

function validateDraftForSave(draft: DesignerDraft): { memberId: string; message: string } | null {
  const peopleById = new Map(draft.people.map((person) => [person.id, person]));

  for (const person of draft.people) {
    const father = person.fatherId ? peopleById.get(person.fatherId) : null;
    const mother = person.motherId ? peopleById.get(person.motherId) : null;
    if (father && father.gender !== 'MALE') {
      return {
        memberId: father.id,
        message: '“' + father.name + '” là bố của “' + person.name + '” nên phải là nam.',
      };
    }
    if (mother && mother.gender !== 'FEMALE') {
      return {
        memberId: mother.id,
        message: '“' + mother.name + '” là mẹ của “' + person.name + '” nên phải là nữ.',
      };
    }
  }

  for (const relationship of draft.relationships) {
    const husband = peopleById.get(relationship.husbandId);
    const wife = peopleById.get(relationship.wifeId);
    if (husband && husband.gender !== 'MALE') {
      return {
        memberId: husband.id,
        message: '“' + husband.name + '” đang là chồng trong một quan hệ hôn nhân nên phải là nam.',
      };
    }
    if (wife && wife.gender !== 'FEMALE') {
      return {
        memberId: wife.id,
        message: '“' + wife.name + '” đang là vợ trong một quan hệ hôn nhân nên phải là nữ.',
      };
    }
  }

  const duplicate = findDuplicatePair(draft);
  if (duplicate) {
    return {
      memberId: duplicate[1].id,
      message:
        'Có hai anh chị em ruột cùng tên “' +
        duplicate[1].name +
        '”. Hãy sửa tên hoặc xóa một người.',
    };
  }

  return null;
}

function relationshipChoiceLabel(kind: RelationshipKind): string {
  return RELATIONSHIP_CHOICES.find((choice) => choice.kind === kind)?.label ?? '';
}

const FULL_ACCESS: TreeEditScope = { fullAccess: true, rootPersonIds: [] };

export function FamilyTreeDesigner({
  familyName,
  familySlug,
  initialTree,
  focus = null,
  editScope = FULL_ACCESS,
}: {
  familyName: string;
  familySlug: string;
  initialTree: FamilyTreeResponse;
  editScope?: TreeEditScope;
  focus?: { personId: string; suggestion: EditSuggestion | null } | null;
}) {
  const initialDraft = useMemo(() => createInitialDraft(initialTree), [initialTree]);
  const [draft, setDraft] = useState<DesignerDraft>(initialDraft);
  const focusMemberId =
    focus && initialDraft.people.some((member) => member.id === focus.personId)
      ? focus.personId
      : null;
  const [selectedMemberId, setSelectedMemberId] = useState(
    focusMemberId ??
      (editScope.fullAccess
        ? null
        : editScope.rootPersonIds.find((id) =>
            initialDraft.people.some((member) => member.id === id),
          )) ??
      initialDraft.protectedMemberId,
  );
  const branchScope = useMemo<BranchScope | null>(
    () =>
      editScope.fullAccess
        ? null
        : computeBranchScope(draft.people, draft.relationships, editScope.rootPersonIds),
    [draft, editScope],
  );
  const branchRootIds = useMemo(
    () => new Set(editScope.fullAccess ? [] : editScope.rootPersonIds),
    [editScope],
  );
  const canEditMember = (memberId: string): boolean =>
    !branchScope || branchScope.editable.has(memberId);
  function choiceBlockedReason(kind: RelationshipKind, target: DesignerMember): string | null {
    const ruleReason = relationshipChoiceBlockedReason(kind, target);
    if (ruleReason || !branchScope) return ruleReason;
    if (!branchScope.editable.has(target.id)) return 'Thành viên này không thuộc chi bạn quản lý.';
    const anchored = branchScope.lineage.has(target.id) && !branchRootIds.has(target.id);
    if ((kind === 'FATHER' || kind === 'MOTHER') && !anchored) {
      return 'Bố mẹ của người này nằm ngoài chi bạn quản lý.';
    }
    if (kind === 'WIFE' && !branchScope.lineage.has(target.id)) {
      return 'Chỉ thêm vợ cho người thuộc dòng của chi.';
    }
    return null;
  }
  const [relationshipTargetId, setRelationshipTargetId] = useState<string | null>(null);
  const [addition, setAddition] = useState<AdditionState>({ step: 'choose' });
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletedPersonIds, setDeletedPersonIds] = useState<string[]>([]);
  const [avatarCropSource, setAvatarCropSource] = useState<File | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pendingAvatars, setPendingAvatars] = useState<
    ReadonlyMap<string, { file: File; previewUrl: string }>
  >(() => new Map());
  const [pendingMediaCleanup, setPendingMediaCleanup] = useState<string[]>([]);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(() =>
    initialTree.people.length > 0 ? JSON.stringify(buildDesignPayload(initialDraft, [])) : null,
  );
  const showToast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [editorOpen, setEditorOpen] = useState(focusMemberId !== null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [suggestion, setSuggestion] = useState(focusMemberId ? (focus?.suggestion ?? null) : null);
  const [suggestionHandled, setSuggestionHandled] = useState(false);
  const [markingSuggestion, setMarkingSuggestion] = useState(false);
  const editorSheet = usePresence(editorOpen);
  const flowRef = useRef<ReactFlowInstance<DesignerFlowNode, FamilyEdge> | null>(null);

  const selectMember = useCallback((memberId: string): void => {
    setSelectedMemberId(memberId);
  }, []);

  const openRelationshipPicker = useCallback((memberId: string): void => {
    setSelectedMemberId(memberId);
    setRelationshipTargetId(memberId);
    setAddition({ step: 'choose' });
  }, []);

  const selectedMember = useMemo(
    () => findMember(draft, selectedMemberId),
    [draft, selectedMemberId],
  );
  const relationshipTarget = useMemo(
    () => (relationshipTargetId ? findMember(draft, relationshipTargetId) : null),
    [draft, relationshipTargetId],
  );
  const deleteTarget = useMemo(
    () => (deleteTargetId ? findMember(draft, deleteTargetId) : null),
    [deleteTargetId, draft],
  );
  const deleteAffectedIds = useMemo(
    () => (deleteTargetId ? collectBranchDeletionIds(draft, deleteTargetId) : new Set<string>()),
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
  const selectedWives = useMemo(() => wivesOf(draft, selectedMemberId), [draft, selectedMemberId]);
  const selectedHusbands = useMemo(
    () => husbandsOf(draft, selectedMemberId),
    [draft, selectedMemberId],
  );
  const selectedParents = useMemo(() => {
    const parents: { role: string; member: DesignerMember }[] = [];
    const father = selectedMember?.fatherId ? findMember(draft, selectedMember.fatherId) : null;
    const mother = selectedMember?.motherId ? findMember(draft, selectedMember.motherId) : null;
    if (father) parents.push({ role: 'Cha', member: father });
    if (mother) parents.push({ role: 'Mẹ', member: mother });
    return parents;
  }, [draft, selectedMember]);
  const selectedSpouseCount =
    selectedMember?.gender === 'MALE' ? selectedWives.length : selectedHusbands.length;
  const relativeCount = selectedParents.length + selectedSpouseCount + selectedChildren.length;
  const selectedComputedAge = selectedMember ? computedAgeAtDeath(selectedMember) : null;
  const selectedAge = selectedMember?.ageAtDeath
    ? Number(selectedMember.ageAtDeath)
    : selectedComputedAge;
  const selectedAgeLabel = selectedAge !== null && selectedAge < 60 ? 'Hưởng dương' : 'Hưởng thọ';
  const worshipKeeperChoices = useMemo(
    () => [...draft.people].filter((member) => member.id !== selectedMemberId).sort(sortMembers),
    [draft.people, selectedMemberId],
  );
  const [editorTab, setEditorTab] = useState<'personal' | 'relations'>('personal');
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
  const pendingAvatarsRef = useRef(pendingAvatars);
  pendingAvatarsRef.current = pendingAvatars;
  useEffect(
    () => () =>
      pendingAvatarsRef.current.forEach((pending) => URL.revokeObjectURL(pending.previewUrl)),
    [],
  );

  const avatarPreviews = useMemo(
    () => new Map([...pendingAvatars].map(([memberId, pending]) => [memberId, pending.previewUrl])),
    [pendingAvatars],
  );
  const selectedAvatarSrc = useMemo(() => {
    const pending = pendingAvatars.get(selectedMemberId);
    if (pending) return pending.previewUrl;

    return selectedMember?.avatarUrl ? familyMediaSrc(familySlug, selectedMember.avatarUrl) : null;
  }, [familySlug, pendingAvatars, selectedMember, selectedMemberId]);
  const selectedPlacement = useMemo(
    () => designPayload.people.find((person) => person.clientId === selectedMemberId) ?? null,
    [designPayload, selectedMemberId],
  );

  const { nodes, edges } = useMemo(
    () =>
      createFlowElements(
        draft,
        familySlug,
        avatarPreviews,
        selectedMemberId,
        branchScope?.editable ?? null,
        selectMember,
        openRelationshipPicker,
      ),
    [
      avatarPreviews,
      branchScope,
      familySlug,
      openRelationshipPicker,
      draft,
      selectMember,
      selectedMemberId,
    ],
  );

  function closeRelationshipPicker(): void {
    setRelationshipTargetId(null);
    setAddition({ step: 'choose' });
  }

  function chooseRelationship(kind: RelationshipKind): void {
    if (!relationshipTarget) return;
    if (choiceBlockedReason(kind, relationshipTarget)) return;

    if (needsMotherChoice(draft, relationshipTarget, kind)) {
      setAddition({ step: 'mother', kind });
      return;
    }
    createRelationship(
      kind,
      isChildKind(kind) ? plannedChildParents(draft, relationshipTarget, undefined) : null,
    );
  }

  function chooseMother(kind: RelationshipKind, motherId: string | null): void {
    if (!relationshipTarget) return;
    createRelationship(kind, plannedChildParents(draft, relationshipTarget, motherId));
  }

  function createRelationship(kind: RelationshipKind, parents: PlannedParents | null): void {
    if (!relationshipTargetId || !relationshipTarget) return;

    const member: DesignerMember = {
      ...createMember(
        relationshipGender(kind),
        kind === 'FATHER' || kind === 'MOTHER'
          ? Math.max(1, relationshipTarget.generation - 1)
          : isChildKind(kind)
            ? relationshipTarget.generation + 1
            : relationshipTarget.generation,
        relationshipTarget.orderInFamily,
      ),
      deletesBranch: isChildKind(kind),
    };

    setDraft((current) => {
      const target = findMember(current, relationshipTargetId);
      if (!target || relationshipChoiceBlockedReason(kind, target)) {
        return current;
      }
      const named = { ...member, name: nextMemberName(current.people) };
      const withMember = { ...current, people: [...current.people, named] };

      if (kind === 'FATHER' || kind === 'MOTHER') {
        const withParent = updateMember(withMember, target.id, (person) =>
          kind === 'FATHER'
            ? { ...person, fatherId: member.id }
            : { ...person, motherId: member.id },
        );
        const otherParentId = kind === 'FATHER' ? target.motherId : target.fatherId;
        return recalculateGenerations(
          otherParentId
            ? withMarriage(
                withParent,
                kind === 'FATHER' ? member.id : otherParentId,
                kind === 'FATHER' ? otherParentId : member.id,
              )
            : withParent,
        );
      }

      if (kind === 'WIFE') {
        return recalculateGenerations(withMarriage(withMember, target.id, member.id));
      }

      const siblings = memberChildren(current, target.id);
      const child = {
        ...named,
        orderInFamily: Math.max(0, ...siblings.map((sibling) => sibling.orderInFamily)) + 1,
        fatherId: parents?.fatherId ?? null,
        motherId: parents?.motherId ?? null,
      };
      return recalculateGenerations({
        ...current,
        people: [...current.people, child],
      });
    });
    setSelectedMemberId(member.id);
    closeRelationshipPicker();
  }

  function moveWife(index: number, offset: number): void {
    setDraft((current) => {
      const wives = wivesOf(current, selectedMemberId);
      const targetIndex = index + offset;
      if (targetIndex < 0 || targetIndex >= wives.length) return current;

      const ordered = [...wives];
      const [moved] = ordered.splice(index, 1);
      if (!moved) return current;
      ordered.splice(targetIndex, 0, moved);
      const orders = new Map(ordered.map((wife, wifeIndex) => [wife.member.id, wifeIndex + 1]));

      return {
        ...current,
        relationships: current.relationships.map((relationship) =>
          relationship.husbandId === selectedMemberId
            ? {
                ...relationship,
                wifeOrder: orders.get(relationship.wifeId) ?? relationship.wifeOrder,
              }
            : relationship,
        ),
      };
    });
  }

  function deleteSelectedMember(): void {
    if (!deleteTargetId || !deleteTarget || deleteTargetId === draft.protectedMemberId) {
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
      .find((memberId) => !removedIds.has(memberId) && Boolean(findMember(draft, memberId)));
    const fallbackMemberId =
      [deleteTarget.fatherId, deleteTarget.motherId, spouseId].find(
        (memberId): memberId is string => Boolean(memberId && !removedIds.has(memberId)),
      ) ?? draft.protectedMemberId;
    const removedDatabaseIds = draft.people
      .filter((member) => removedIds.has(member.id))
      .map((member) => member.databaseId)
      .filter((databaseId): databaseId is string => Boolean(databaseId));

    setDeletedPersonIds((current) => [...new Set([...current, ...removedDatabaseIds])]);
    setDraft((current) =>
      removeMembers(current, collectBranchDeletionIds(current, deleteTargetId)),
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
      const orders = new Map(ordered.map((child, childIndex) => [child.id, childIndex + 1]));

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

  function patchDeathDate(value: string): void {
    patchWithAnniversaryText(value ? { deathDate: value, isAlive: false } : { deathDate: value });
  }

  function patchWithAnniversaryText(patch: Partial<DesignerMember>): void {
    if (!selectedMember) return;
    const filled = anniversaryText(selectedMember);
    const follows =
      !selectedMember.deathAnniversaryText.trim() || selectedMember.deathAnniversaryText === filled;
    patchSelectedMember(
      follows
        ? { ...patch, deathAnniversaryText: anniversaryText({ ...selectedMember, ...patch }) }
        : patch,
    );
  }

  function patchIsAlive(isAlive: boolean): void {
    patchSelectedMember(
      isAlive
        ? {
            isAlive,
            courtesyName: '',
            deathDate: '',
            lunarDeathAnniversary: '',
            burialPlace: '',
            ageAtDeath: '',
            worshipPlace: '',
            worshipKeeperId: '',
            deathAnniversaryText: '',
          }
        : { isAlive },
    );
  }

  function pickAvatarSource(file: File): void {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      showToast({
        kind: 'error',
        message: 'Chỉ hỗ trợ ảnh định dạng JPG, PNG hoặc WEBP.',
      });
      return;
    }
    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      showToast({
        kind: 'error',
        message: 'Ảnh gốc vượt quá dung lượng tối đa 12 MB.',
      });
      return;
    }

    setAvatarCropSource(file);
  }

  function discardAvatarFile(avatarUrl: string): void {
    if (!avatarUrl.startsWith('/media/')) return;

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
      if (file) next.set(memberId, { file, previewUrl: URL.createObjectURL(file) });
      else next.delete(memberId);
      return next;
    });
  }

  function acceptCroppedAvatar(cropped: File): void {
    stagePendingAvatar(selectedMemberId, cropped);
    showToast({
      kind: 'success',
      message: 'Đã chọn ảnh. Bấm “Lưu tất cả” để ghi vào gia phả.',
    });
  }

  function removeAvatar(): void {
    const previous = selectedMember?.avatarUrl ?? '';
    stagePendingAvatar(selectedMemberId, null);
    patchSelectedMember({ avatarUrl: '' });
    if (previous) discardAvatarFile(previous);
  }

  async function resolveSuggestion(): Promise<void> {
    if (!suggestion || markingSuggestion) return;
    setMarkingSuggestion(true);
    try {
      if (!(await saveAll())) return;
      await updateEditSuggestionStatus(familySlug, suggestion.id, 'RESOLVED');
      setSuggestionHandled(true);
      showToast({ kind: 'success', message: 'Đã đánh dấu đề xuất là đã xử lý.' });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'cập nhật đề xuất') });
    } finally {
      setMarkingSuggestion(false);
    }
  }

  function confirmLeave(event: MouseEvent<HTMLAnchorElement>): void {
    if (!hasUnsavedChanges) return;
    event.preventDefault();
    const href = event.currentTarget.href;
    void confirm({
      title: 'Rời trang khi chưa lưu?',
      message: 'Bản thiết kế có thay đổi chưa lưu. Nếu rời trang, các thay đổi này sẽ mất.',
      confirmLabel: 'Rời trang',
      cancelLabel: 'Ở lại',
      tone: 'danger',
    }).then((leave) => {
      if (leave) router.push(href);
    });
  }

  async function saveAll(): Promise<boolean> {
    if (savingAll) return false;
    if (!hasUnsavedChanges) return true;

    const invalid = draft.people
      .map((member) => ({ member, message: validateMemberForSave(member) }))
      .find(
        (entry): entry is { member: DesignerMember; message: string } => entry.message !== null,
      );

    if (invalid) {
      setSelectedMemberId(invalid.member.id);
      showToast({
        kind: 'error',
        message:
          'Thông tin của “' +
          (invalid.member.name.trim() || 'Thành viên chưa đặt tên') +
          '” chưa hợp lệ. ' +
          invalid.message,
      });
      return false;
    }

    const treeProblem = validateDraftForSave(draft);
    if (treeProblem) {
      setSelectedMemberId(treeProblem.memberId);
      showToast({ kind: 'error', message: treeProblem.message });
      return false;
    }

    setSavingAll(true);

    try {
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
          kind: 'error',
          message: getApiErrorMessage(uploadError, 'tải ảnh lên'),
        });
        return false;
      }

      const payload =
        uploadedAvatars.size > 0
          ? buildDesignPayload(applyAvatarUrls(draft, uploadedAvatars), deletedPersonIds)
          : designPayload;

      const result = await saveFamilyTreeDesign(familySlug, payload);
      const databaseIds = new Map(
        result.savedPeople.map((person) => [person.clientId, person.databaseId]),
      );

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
        applyDatabaseIds(applyAvatarUrls(current, uploadedAvatars), databaseIds),
      );
      setDeletedPersonIds([]);
      pendingAvatars.forEach((pending) => URL.revokeObjectURL(pending.previewUrl));
      setPendingAvatars(new Map());

      for (const avatarUrl of [...pendingMediaCleanup, ...replacedAvatarUrls]) {
        void deleteFamilyMedia(familySlug, avatarUrl).catch(() => undefined);
      }
      setPendingMediaCleanup([]);
      showToast({
        kind: 'success',
        message:
          'Đã lưu toàn bộ ' +
          result.savedPeople.length +
          ' thành viên và ' +
          result.savedRelationshipCount +
          ' quan hệ.',
      });
      return true;
    } catch (error: unknown) {
      showToast({
        kind: 'error',
        message: getApiErrorMessage(error, 'lưu toàn bộ gia phả'),
      });
      return false;
    } finally {
      setSavingAll(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-paper-deep lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden">
      <header className="heritage-hero hidden shrink-0 rounded-none border-x-0 border-t-0 text-gold-50 lg:block">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-200/10 text-gold-200 ring-1 ring-gold-200/25">
              <Network className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-semibold sm:text-2xl">
                Thiết kế gia phả
              </h1>
              <p className="truncate text-xs text-gold-100/70">{familyName}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full border border-gold-200/25 bg-gold-100/10 px-3 py-1.5 text-xs text-gold-100">
              Bản nháp · {memberCount} khung
            </span>
            <Button
              type="button"
              className="border-gold-300/40 bg-gold-200 text-wood-900 hover:bg-gold-100"
              disabled={savingAll || !hasUnsavedChanges}
              title={
                hasUnsavedChanges ? 'Lưu toàn bộ bản thiết kế' : 'Không có thay đổi nào cần lưu'
              }
              onClick={() => void saveAll()}
            >
              {savingAll ? (
                <InlineLoader className="size-4" />
              ) : hasUnsavedChanges ? (
                <Save className="size-4" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              {savingAll ? 'Đang lưu tất cả…' : hasUnsavedChanges ? 'Lưu tất cả' : 'Đã lưu'}
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
            >
              <Link
                href={
                  '/admin/' + encodeURIComponent(familySlug) + (focus?.suggestion ? '#de-xuat' : '')
                }
                onClick={confirmLeave}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Quay lại quản trị
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          'grid lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden lg:transition-[grid-template-columns] lg:duration-500 lg:ease-in-out motion-reduce:transition-none',
          panelCollapsed
            ? 'lg:grid-cols-[minmax(0,1fr)_0rem]'
            : 'lg:grid-cols-[minmax(0,1fr)_22rem]',
        )}
      >
        <section
          className="relative h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] overflow-hidden bg-paper lg:h-auto lg:border-r lg:border-gold-500/30"
          aria-label="Canvas thiết kế cây gia phả"
        >
          <button
            type="button"
            className="absolute right-0 top-4 z-10 hidden h-11 w-8 place-items-center rounded-l-xl border border-r-0 border-gold-500/40 bg-[var(--card)] text-stone-600 shadow-sm transition hover:bg-gold-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 lg:grid"
            onClick={() => setPanelCollapsed((collapsed) => !collapsed)}
            aria-expanded={!panelCollapsed}
            aria-label={panelCollapsed ? 'Mở thông tin thành viên' : 'Thu gọn thông tin thành viên'}
            title={panelCollapsed ? 'Mở thông tin thành viên' : 'Thu gọn thông tin thành viên'}
          >
            {panelCollapsed ? (
              <ChevronLeft className="size-5" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-5" aria-hidden="true" />
            )}
          </button>
          <ReactFlow
            key={memberCount}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={familyEdgeTypes}
            fitView
            fitViewOptions={
              focusMemberId
                ? { nodes: [{ id: selectedMemberId }], padding: 0.8, maxZoom: 1 }
                : { padding: 0.25, maxZoom: 1 }
            }
            minZoom={0.25}
            maxZoom={1.6}
            nodesDraggable={false}
            nodesConnectable={false}
            onInit={(instance) => {
              flowRef.current = instance;
            }}
            onNodeClick={(_event, node) => {
              selectMember(node.id);
              setEditorOpen(true);
            }}
            deleteKeyCode={null}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Lines} gap={32} size={0.7} color="#dfcda7" />
            <Controls position="bottom-left" showInteractive={false} className="max-lg:!hidden" />
            <Panel
              position="top-left"
              className="rounded-full border border-gold-500/30 bg-paper/90 px-3 py-1.5 text-xs text-stone-600 shadow-sm backdrop-blur lg:hidden"
            >
              {memberCount} khung · Chạm vào khung để sửa
            </Panel>
          </ReactFlow>
        </section>

        {editorSheet.mounted ? (
          <button
            type="button"
            data-presence={editorSheet.state}
            className="ui-backdrop fixed inset-0 z-[44] bg-brand-950/40 backdrop-blur-[2px] data-[presence=closed]:pointer-events-none lg:hidden"
            aria-label="Đóng thông tin thành viên"
            tabIndex={-1}
            onClick={() => setEditorOpen(false)}
          />
        ) : null}
        <aside
          className={cn(
            'overflow-y-auto bg-[var(--card)] p-5',
            editorSheet.mounted
              ? 'ui-sheet-below-lg fixed inset-x-0 bottom-0 z-[45] max-h-[85dvh] rounded-t-3xl pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl'
              : 'hidden',
            'lg:static lg:z-auto lg:block lg:h-auto lg:min-h-0 lg:max-h-none lg:rounded-none lg:pb-5 lg:shadow-none',
            'lg:w-[22rem] lg:transition-[opacity,visibility] lg:duration-500 lg:ease-in-out motion-reduce:transition-none',
            panelCollapsed && 'lg:invisible lg:opacity-0',
          )}
          aria-label="Thông tin thành viên"
          data-sheet={editorSheet.state}
        >
          <div
            className="mx-auto -mt-1 mb-3 h-1 w-10 rounded-full bg-stone-300 lg:hidden"
            aria-hidden="true"
          />
          <div className="flex items-center justify-between gap-3 border-b pb-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                Đang chọn
              </p>
              <h2 className="mt-1 text-lg font-semibold text-brand-950">Thông tin thành viên</h2>
            </div>
            <span
              className={cn(
                'grid size-10 place-items-center overflow-hidden rounded-full ring-1',
                selectedMember ? genderStyles[selectedMember.gender] : genderStyles.UNKNOWN,
              )}
            >
              {selectedAvatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedAvatarSrc}
                  alt=""
                  className="size-full object-cover"
                  draggable={false}
                />
              ) : (
                <GenderAvatarFallback
                  gender={selectedMember?.gender ?? 'UNKNOWN'}
                  generation={selectedPlacement?.generation}
                  birthDate={selectedMember?.birthDate}
                />
              )}
            </span>
            <button
              type="button"
              className="grid size-10 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-800 lg:hidden"
              onClick={() => setEditorOpen(false)}
              aria-label="Đóng"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          {suggestion && selectedMemberId === suggestion.person.id ? (
            <section
              className="mt-4 grid gap-3 rounded-2xl border border-amber-700/25 bg-amber-50 p-4"
              aria-label="Đề xuất chỉnh sửa"
            >
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                <MessageSquareQuote className="size-4" aria-hidden="true" />
                Đề xuất từ {suggestion.proposerName}
              </p>
              <p className="whitespace-pre-line break-words text-sm leading-6 text-stone-800">
                {suggestion.content}
              </p>
              {suggestionHandled ? (
                <p className="flex items-center gap-2 text-sm font-medium text-brand-800">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Đã đánh dấu đã xử lý.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={markingSuggestion || savingAll}
                    onClick={() => void resolveSuggestion()}
                  >
                    {markingSuggestion ? (
                      <InlineLoader className="size-4" />
                    ) : (
                      <Check className="size-4" aria-hidden="true" />
                    )}
                    {hasUnsavedChanges ? 'Lưu và đánh dấu đã xử lý' : 'Đánh dấu đã xử lý'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setSuggestion(null)}
                  >
                    Ẩn đề xuất
                  </Button>
                </div>
              )}
            </section>
          ) : null}

          {selectedMember && !canEditMember(selectedMember.id) ? (
            <p className="mt-5 flex gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm leading-6 text-stone-600">
              <Lock className="mt-1 size-4 shrink-0" aria-hidden="true" />
              Thành viên này không thuộc chi/nhánh bạn được giao quản lý nên chỉ xem được.
            </p>
          ) : null}

          {selectedMember ? (
            <div className="mt-4 grid min-w-0 gap-4">
              <EditorTabs
                tabs={[
                  {
                    value: 'personal',
                    label: 'Cá nhân',
                    icon: <UserRound className="size-4 shrink-0" aria-hidden="true" />,
                  },
                  {
                    value: 'relations',
                    label: 'Quan hệ',
                    icon: <Network className="size-4 shrink-0" aria-hidden="true" />,
                    count: relativeCount,
                  },
                ]}
                value={editorTab}
                onChange={setEditorTab}
                panelId="designer-member-panel"
              />

              <fieldset
                id="designer-member-panel"
                role="tabpanel"
                disabled={!canEditMember(selectedMember.id)}
                className="grid min-w-0 gap-4"
              >
                {editorTab === 'personal' ? (
                  <>
                    <EditorSection number={1} title="Ảnh & vai vế">
                      <div className="flex items-center gap-4">
                        <span className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-gold-500/40 bg-gold-50">
                          {selectedAvatarSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={selectedAvatarSrc}
                              alt={'Ảnh đại diện của ' + selectedMember.name}
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
                          <div>
                            <p className="text-sm font-semibold text-brand-950">Ảnh đại diện</p>
                            <p className="text-xs leading-5 text-stone-500">
                              JPG, PNG hoặc WEBP. Sẽ hiện trên phả đồ.
                            </p>
                          </div>
                          <input
                            ref={avatarInputRef}
                            id="designer-member-avatar"
                            type="file"
                            accept={ACCEPTED_IMAGE_TYPES.join(',')}
                            className="sr-only"
                            onChange={(event) => {
                              const file = event.currentTarget.files?.[0];
                              event.currentTarget.value = '';
                              if (file) pickAvatarSource(file);
                            }}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={savingAll}
                              onClick={() => avatarInputRef.current?.click()}
                            >
                              <ImagePlus className="size-4" aria-hidden="true" />
                              {selectedAvatarSrc ? 'Đổi ảnh' : 'Tải ảnh lên'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={savingAll}
                              onClick={() => setCameraOpen(true)}
                            >
                              <Camera className="size-4" aria-hidden="true" />
                              Chụp ảnh
                            </Button>
                          </div>
                          {selectedAvatarSrc ? (
                            <button
                              type="button"
                              className="w-fit text-left text-xs font-medium text-red-700 underline-offset-2 hover:underline"
                              onClick={removeAvatar}
                            >
                              Xóa ảnh đại diện
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="border-t border-gold-500/20" />

                      <DesignerTextField
                        id="designer-member-honorific"
                        label="Vai vế hiển thị trên phả đồ"
                        value={selectedMember.honorific}
                        maxLength={100}
                        placeholder="Ông, Cụ, Bà, Chi trưởng, Thuỷ tổ..."
                        onChange={(value) => patchSelectedMember({ honorific: value })}
                      />
                      <FieldHint>Hiện dưới tên trong ô phả đồ</FieldHint>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                          <span className="text-sm font-medium text-brand-950">Đời thứ</span>
                          <output className="flex h-11 items-center rounded-xl border border-gold-500/30 bg-gold-100/60 px-3 text-sm tabular-nums text-wood-800">
                            {selectedPlacement?.generation ?? '–'}
                          </output>
                        </div>
                        <div className="grid gap-1.5">
                          <span className="text-sm font-medium text-brand-950">
                            Thứ tự trong nhà
                          </span>
                          <output className="flex h-11 items-center rounded-xl border border-gold-500/30 bg-gold-100/60 px-3 text-sm tabular-nums text-wood-800">
                            {selectedPlacement?.orderInFamily ?? '–'}
                          </output>
                        </div>
                      </div>
                      <FieldHint>Tự tính theo quan hệ cha – con</FieldHint>
                    </EditorSection>

                    <EditorSection number={2} title="Nhân thân">
                      <DesignerTextField
                        id="designer-member-name"
                        label="Họ và tên *"
                        value={selectedMember.name}
                        maxLength={191}
                        placeholder="Họ và tên đầy đủ"
                        onChange={(value) => patchSelectedMember({ name: value })}
                      />

                      <DesignerTextField
                        id="designer-member-nickname"
                        label="Tên khác"
                        value={selectedMember.nickname}
                        maxLength={191}
                        placeholder="Tên thường gọi, biệt danh..."
                        onChange={(value) => patchSelectedMember({ nickname: value })}
                      />

                      <div className="grid gap-1.5">
                        <span className="text-sm font-medium text-brand-950">Giới tính</span>
                        <Segmented
                          label="Giới tính"
                          options={GENDER_CHOICES}
                          value={selectedMember.gender}
                          onChange={(gender) => patchSelectedMember({ gender })}
                        />
                      </div>

                      <DesignerTextField
                        id="designer-member-birth-date"
                        label="Ngày sinh"
                        type="partialDate"
                        value={selectedMember.birthDate}
                        onChange={(value) => patchSelectedMember({ birthDate: value })}
                      />
                      <FieldHint>Chỉ biết năm cũng được</FieldHint>

                      <DesignerTextField
                        id="designer-member-phone"
                        label="Số điện thoại"
                        type="tel"
                        value={selectedMember.phone}
                        maxLength={30}
                        placeholder="Nhập số điện thoại"
                        onChange={(value) => patchSelectedMember({ phone: value })}
                      />

                      <div className="grid gap-1.5">
                        <label
                          htmlFor="designer-member-marital-status"
                          className="text-sm font-medium text-brand-950"
                        >
                          Tình trạng hôn nhân
                        </label>
                        <div className="relative">
                          <select
                            id="designer-member-marital-status"
                            value={selectedMember.maritalStatus}
                            onChange={(event) =>
                              patchSelectedMember({
                                maritalStatus: event.currentTarget.value as MaritalStatus | '',
                              })
                            }
                            className={cn(fieldClassName, 'w-full appearance-none pr-10')}
                          >
                            <option value="">Chưa chọn</option>
                            {(
                              Object.entries(MARITAL_STATUS_LABELS) as Array<
                                [MaritalStatus, string]
                              >
                            ).map(([status, statusLabel]) => (
                              <option key={status} value={status}>
                                {statusLabel}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-stone-500"
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      <DesignerTextField
                        id="designer-member-education"
                        label="Trình độ"
                        value={selectedMember.education}
                        maxLength={191}
                        placeholder="Học vấn, kĩ năng..."
                        onChange={(value) => patchSelectedMember({ education: value })}
                      />

                      <DesignerTextField
                        id="designer-member-occupation"
                        label="Nghề nghiệp"
                        value={selectedMember.occupation}
                        maxLength={191}
                        placeholder="Nghề, chức vụ..."
                        onChange={(value) => patchSelectedMember({ occupation: value })}
                      />
                    </EditorSection>

                    <EditorSection number={3} title="Quê quán & địa chỉ">
                      <DesignerTextField
                        id="designer-member-hometown"
                        label="Nguyên quán"
                        value={selectedMember.hometown}
                        maxLength={255}
                        placeholder="Xã/phường, tỉnh/thành phố..."
                        onChange={(value) => patchSelectedMember({ hometown: value })}
                      />

                      <div className="border-t border-gold-500/20" />

                      <DesignerTextField
                        id="designer-member-current-address"
                        label="Địa chỉ hiện tại"
                        value={selectedMember.currentAddress}
                        maxLength={255}
                        placeholder="Số nhà, đường, thôn..."
                        onChange={(value) => patchSelectedMember({ currentAddress: value })}
                      />
                    </EditorSection>

                    <EditorSection number={4} title="Tiểu sử">
                      <label className="sr-only" htmlFor="designer-member-biography">
                        Tiểu sử
                      </label>
                      <textarea
                        id="designer-member-biography"
                        value={selectedMember.biography}
                        onChange={(event) =>
                          patchSelectedMember({ biography: event.currentTarget.value })
                        }
                        rows={4}
                        maxLength={10000}
                        placeholder="Kể lại thân thế, sự nghiệp, công đức của thành viên..."
                        className="min-w-0 resize-y rounded-xl border bg-white px-3 py-2.5 text-base leading-6 outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm"
                      />
                    </EditorSection>

                    <EditorSection number={5} title="Mất & thờ cúng">
                      <Segmented
                        label="Còn sống hay đã mất"
                        options={LIFE_CHOICES}
                        value={selectedMember.isAlive ? 'ALIVE' : 'DECEASED'}
                        onChange={(choice) => patchIsAlive(choice === 'ALIVE')}
                      />

                      {selectedMember.isAlive ? (
                        <p className="text-xs leading-5 text-stone-500">
                          Thành viên còn sống. Chọn &quot;Đã mất&quot; để nhập ngày mất, ngày giỗ,
                          nơi thờ cúng và mộ táng.
                        </p>
                      ) : (
                        <>
                          <DesignerTextField
                            id="designer-member-death-date"
                            label="Ngày mất (dương lịch)"
                            type="partialDate"
                            value={selectedMember.deathDate}
                            onChange={patchDeathDate}
                          />

                          <DeathAnniversaryPicker
                            id="designer-member-anniversary"
                            label="Ngày giỗ (âm lịch)"
                            maxDayInMonth={30}
                            value={selectedMember.lunarDeathAnniversary}
                            onChange={(value) =>
                              patchWithAnniversaryText({ lunarDeathAnniversary: value })
                            }
                          />

                          <DesignerTextField
                            id="designer-member-anniversary-text"
                            label="Cách gọi ngày giỗ"
                            value={selectedMember.deathAnniversaryText}
                            maxLength={191}
                            placeholder="20 tháng Chạp năm Canh Ngọ"
                            onChange={(value) =>
                              patchSelectedMember({ deathAnniversaryText: value })
                            }
                          />
                          <FieldHint>
                            Hiện ở trang xem. Tự điền từ ngày giỗ và năm mất, sửa được (ví dụ thêm
                            giờ mất).
                          </FieldHint>

                          <DesignerTextField
                            id="designer-member-age-at-death"
                            label={selectedAgeLabel}
                            value={selectedMember.ageAtDeath}
                            maxLength={3}
                            placeholder={
                              selectedComputedAge === null
                                ? 'Số tuổi'
                                : `${selectedComputedAge} tuổi`
                            }
                            onChange={(value) =>
                              patchSelectedMember({
                                ageAtDeath: value.replace(/\D/g, '').slice(0, 3),
                              })
                            }
                          />
                          <FieldHint>Tự tính = năm mất − năm sinh</FieldHint>

                          <DesignerTextField
                            id="designer-member-worship-place"
                            label="Thờ cúng tại"
                            value={selectedMember.worshipPlace}
                            maxLength={255}
                            placeholder="Vị trí thờ cúng hiện tại"
                            onChange={(value) => patchSelectedMember({ worshipPlace: value })}
                          />

                          <MemberPicker
                            id="designer-member-worship-keeper"
                            label="Người phụ trách cúng giỗ"
                            members={worshipKeeperChoices}
                            value={selectedMember.worshipKeeperId}
                            onChange={(worshipKeeperId) => patchSelectedMember({ worshipKeeperId })}
                          />

                          <DesignerTextField
                            id="designer-member-courtesy-name"
                            label="Tên tự / hiệu / thụy"
                            value={selectedMember.courtesyName}
                            maxLength={191}
                            placeholder="Không bắt buộc"
                            onChange={(value) => patchSelectedMember({ courtesyName: value })}
                          />

                          <DesignerTextField
                            id="designer-member-burial-place"
                            label="Mộ táng"
                            value={selectedMember.burialPlace}
                            maxLength={255}
                            placeholder="Địa chỉ an lạc"
                            onChange={(value) => patchSelectedMember({ burialPlace: value })}
                          />
                        </>
                      )}
                    </EditorSection>

                    <p className="flex gap-2 rounded-xl border border-amber-900/15 bg-amber-50/70 px-3 py-2.5 text-xs leading-5 text-amber-950/80">
                      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <span>
                        Chỉ <strong>Họ và tên</strong> là bắt buộc. Các mục khác có thể bổ sung dần.
                      </span>
                    </p>
                  </>
                ) : (
                  <>
                    <EditorSection title="Cha mẹ">
                      {selectedParents.length > 0 ? (
                        <ul className="grid gap-2">
                          {selectedParents.map(({ role, member }) => (
                            <RelativeRow
                              key={member.id}
                              member={member}
                              role={role}
                              onOpen={() => selectMember(member.id)}
                            />
                          ))}
                        </ul>
                      ) : (
                        <p className="flex gap-2 rounded-xl border border-amber-900/15 bg-amber-50/70 px-3 py-2.5 text-xs leading-5 text-amber-950/80">
                          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                          Chưa có cha mẹ trong phả — thành viên đứng đầu nhánh này.
                        </p>
                      )}
                    </EditorSection>

                    <EditorSection
                      title="Vợ / chồng"
                      badge={<CountBadge count={selectedSpouseCount} />}
                    >
                      {selectedMember.gender === 'MALE' && selectedWives.length > 0 ? (
                        <ol className="grid gap-2">
                          {selectedWives.map((wife, index) => (
                            <RelativeRow
                              key={wife.member.id}
                              member={wife.member}
                              role={selectedWives.length > 1 ? `Vợ ${index + 1}` : 'Vợ'}
                              onOpen={() => selectMember(wife.member.id)}
                              onMove={
                                selectedWives.length > 1
                                  ? {
                                      up: index > 0 ? () => moveWife(index, -1) : null,
                                      down:
                                        index < selectedWives.length - 1
                                          ? () => moveWife(index, 1)
                                          : null,
                                    }
                                  : undefined
                              }
                            />
                          ))}
                        </ol>
                      ) : selectedHusbands.length > 0 ? (
                        <ul className="grid gap-2">
                          {selectedHusbands.map((husband) => (
                            <RelativeRow
                              key={husband.id}
                              member={husband}
                              role="Chồng"
                              onOpen={() => selectMember(husband.id)}
                            />
                          ))}
                        </ul>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        disabled={savingAll}
                        onClick={() => openRelationshipPicker(selectedMember.id)}
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        Thêm vợ / chồng
                      </Button>
                    </EditorSection>

                    <EditorSection
                      title="Các con"
                      badge={<CountBadge count={selectedChildren.length} />}
                    >
                      {selectedChildren.length > 0 ? (
                        <ol className="grid gap-2">
                          {selectedChildren.map((child, index) => (
                            <RelativeRow
                              key={child.id}
                              member={child}
                              order={index + 1}
                              role={childRole(selectedChildren, child)}
                              onOpen={() => selectMember(child.id)}
                              onMove={
                                selectedChildren.length > 1
                                  ? {
                                      up: index > 0 ? () => moveChild(index, -1) : null,
                                      down:
                                        index < selectedChildren.length - 1
                                          ? () => moveChild(index, 1)
                                          : null,
                                    }
                                  : undefined
                              }
                            />
                          ))}
                        </ol>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        disabled={savingAll}
                        onClick={() => openRelationshipPicker(selectedMember.id)}
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        Thêm con
                      </Button>
                    </EditorSection>

                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
                      disabled={
                        selectedMember.id === draft.protectedMemberId ||
                        branchRootIds.has(selectedMember.id) ||
                        savingAll
                      }
                      title={
                        selectedMember.id === draft.protectedMemberId
                          ? 'Khung khởi điểm không thể xóa'
                          : branchRootIds.has(selectedMember.id)
                            ? 'Người đứng đầu chi chỉ trưởng họ mới xóa được'
                            : 'Xóa thành viên đang chọn'
                      }
                      onClick={() => setDeleteTargetId(selectedMember.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Xóa thành viên
                    </Button>
                  </>
                )}
              </fieldset>
            </div>
          ) : null}
        </aside>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gold-500/30 bg-paper/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(74,46,18,0.08)] backdrop-blur lg:hidden"
        aria-label="Công cụ thiết kế"
      >
        <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
          <li>
            <Link
              href={
                '/admin/' + encodeURIComponent(familySlug) + (focus?.suggestion ? '#de-xuat' : '')
              }
              className="block h-full"
              onClick={confirmLeave}
            >
              <BottomTab icon={ArrowLeft} label="Quản trị" />
            </Link>
          </li>
          <li>
            <button
              type="button"
              className="block size-full"
              onClick={() =>
                void flowRef.current?.fitView({ padding: 0.25, maxZoom: 1, duration: 400 })
              }
            >
              <BottomTab icon={Scan} label="Toàn cây" />
            </button>
          </li>
          <li>
            <button
              type="button"
              className="block size-full disabled:opacity-40"
              disabled={!selectedMember}
              aria-expanded={editorOpen}
              onClick={() => setEditorOpen((open) => !open)}
            >
              <BottomTab icon={PencilLine} label="Sửa" active={editorOpen} />
            </button>
          </li>
          <li>
            <button
              type="button"
              className="block size-full disabled:opacity-40"
              disabled={!selectedMember || savingAll}
              onClick={() => {
                if (!selectedMember) return;
                setEditorOpen(false);
                openRelationshipPicker(selectedMember.id);
              }}
            >
              <BottomTab icon={Plus} label="Thêm" />
            </button>
          </li>
          <li>
            <button
              type="button"
              className="relative block size-full disabled:opacity-60"
              disabled={savingAll || !hasUnsavedChanges}
              onClick={() => void saveAll()}
              aria-label={savingAll ? 'Đang lưu' : hasUnsavedChanges ? 'Lưu tất cả' : 'Đã lưu'}
            >
              <BottomTab
                icon={hasUnsavedChanges ? Save : Check}
                busy={savingAll}
                label={savingAll ? 'Đang lưu' : hasUnsavedChanges ? 'Lưu' : 'Đã lưu'}
                active={hasUnsavedChanges}
              />
              {hasUnsavedChanges && !savingAll ? (
                <span
                  className="absolute right-[calc(50%-1rem)] top-2.5 size-2 rounded-full bg-amber-400 ring-2 ring-white"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          </li>
        </ul>
      </nav>

      <Presence>
        {relationshipTargetId && relationshipTarget ? (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <button
              type="button"
              className="ui-backdrop absolute inset-0 bg-brand-950/45 backdrop-blur-[2px]"
              aria-label="Đóng hộp chọn quan hệ"
              onClick={closeRelationshipPicker}
            />
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="relationship-dialog-title"
              className="ui-dialog heritage-panel relative max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl p-5 shadow-2xl sm:p-6"
            >
              <button
                type="button"
                className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                onClick={closeRelationshipPicker}
                aria-label="Đóng"
              >
                <X className="size-5" aria-hidden="true" />
              </button>

              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                Mở rộng cây
              </p>
              <h2
                id="relationship-dialog-title"
                className="mt-2 pr-10 text-xl font-semibold text-brand-950"
              >
                {addition.step === 'choose'
                  ? 'Thêm quan hệ cho ' + relationshipTarget.name
                  : relationshipChoiceLabel(addition.kind) + ' cho ' + relationshipTarget.name}
              </h2>

              {addition.step === 'choose' ? (
                <>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Bố/mẹ nằm ở thế hệ phía trên; vợ nằm cùng hàng và con nằm ở hàng dưới, ngay dưới
                    cặp bố mẹ.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {RELATIONSHIP_CHOICES.map((choice) => {
                      const Icon = choice.icon;
                      const blockedReason = choiceBlockedReason(choice.kind, relationshipTarget);
                      const tooltipId = 'relationship-choice-tip-' + choice.kind;
                      return (
                        <div
                          key={choice.kind}
                          className={cn(
                            'group relative flex hover:z-20 focus-within:z-20',
                            RELATIONSHIP_CHOICE_GRID_CLASSES[choice.kind],
                          )}
                        >
                          <button
                            type="button"
                            aria-disabled={blockedReason ? true : undefined}
                            aria-describedby={blockedReason ? tooltipId : undefined}
                            className={cn(
                              'flex min-h-[76px] w-full items-center gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700',
                              blockedReason
                                ? 'cursor-not-allowed border-stone-200 bg-stone-50'
                                : 'border-amber-900/15 bg-white hover:border-brand-800/35 hover:bg-brand-50',
                            )}
                            onClick={() => chooseRelationship(choice.kind)}
                          >
                            <span
                              className={cn(
                                'grid size-10 shrink-0 place-items-center rounded-xl',
                                blockedReason
                                  ? 'bg-stone-100 text-stone-400'
                                  : 'bg-brand-100 text-brand-900',
                              )}
                            >
                              <Icon className="size-5" aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                              <span
                                className={cn(
                                  'block text-sm font-semibold',
                                  blockedReason ? 'text-stone-400' : 'text-brand-950',
                                )}
                              >
                                {choice.label}
                              </span>
                              <span
                                className={cn(
                                  'mt-0.5 block truncate text-xs',
                                  blockedReason ? 'text-stone-400' : 'text-stone-500',
                                )}
                              >
                                {choice.description}
                              </span>
                            </span>
                          </button>
                          {blockedReason ? (
                            <span
                              id={tooltipId}
                              role="tooltip"
                              className="pointer-events-none invisible absolute bottom-full left-1/2 mb-2 w-max max-w-[16rem] -translate-x-1/2 rounded-lg bg-brand-950 px-3 py-2 text-center text-xs font-medium leading-5 text-white shadow-xl group-focus-within:visible group-hover:visible"
                            >
                              {blockedReason}
                              <span
                                aria-hidden="true"
                                className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-brand-950"
                              />
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {addition.step === 'mother' ? (
                <>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {relationshipTarget.name} có nhiều vợ. Chọn mẹ của người con để đặt con dưới
                    đúng cặp bố – mẹ.
                  </p>
                  <div className="mt-5 grid gap-2">
                    {wivesOf(draft, relationshipTarget.id).map((wife, index) => (
                      <button
                        key={wife.member.id}
                        type="button"
                        className="rounded-2xl border border-amber-900/15 bg-white px-4 py-3 text-left text-sm font-medium text-brand-950 transition hover:border-brand-800/35 hover:bg-brand-50"
                        onClick={() => chooseMother(addition.kind, wife.member.id)}
                      >
                        Vợ {index + 1} – {wife.member.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="rounded-2xl border border-dashed border-amber-900/25 bg-white px-4 py-3 text-left text-sm font-medium text-stone-600 transition hover:bg-stone-50"
                      onClick={() => chooseMother(addition.kind, null)}
                    >
                      Chưa xác định mẹ
                    </button>
                  </div>
                  <div className="mt-5 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddition({ step: 'choose' })}
                    >
                      Quay lại
                    </Button>
                  </div>
                </>
              ) : null}
            </section>
          </div>
        ) : null}
      </Presence>

      <Presence>
        {cameraOpen ? (
          <CameraCapture
            onCancel={() => setCameraOpen(false)}
            onCaptured={(photo) => {
              setCameraOpen(false);
              pickAvatarSource(photo);
            }}
          />
        ) : null}
      </Presence>

      <Presence>
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
      </Presence>

      <Presence>
        {deleteTargetId ? (
          <div className="fixed inset-0 z-[60] grid place-items-center p-4">
            <button
              type="button"
              className="ui-backdrop absolute inset-0 bg-brand-950/45 backdrop-blur-[2px]"
              aria-label="Đóng hộp xác nhận xóa thành viên"
              onClick={() => setDeleteTargetId(null)}
            />
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-member-dialog-title"
              aria-describedby="delete-member-dialog-description"
              className="ui-dialog heritage-panel relative w-full max-w-md rounded-2xl border-red-900/15 p-5 shadow-2xl sm:p-6"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-red-100 text-red-700">
                <Trash2 className="size-6" aria-hidden="true" />
              </span>
              <h2
                id="delete-member-dialog-title"
                className="mt-4 text-xl font-semibold text-brand-950"
              >
                Xóa thành viên?
              </h2>
              <div
                id="delete-member-dialog-description"
                className="mt-2 space-y-2 text-sm leading-6 text-stone-600"
              >
                <p>
                  Bạn có chắc muốn xóa{' '}
                  <strong className="font-semibold text-stone-900">
                    {deleteTarget?.name ?? 'thành viên này'}
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
                <Button type="button" variant="outline" onClick={() => setDeleteTargetId(null)}>
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
      </Presence>
    </main>
  );
}
