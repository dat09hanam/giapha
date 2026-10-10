'use client';

import {
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitBranch, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { InlineLoader } from '@/components/ui/heritage-loader';
import { familyEdgeTypes } from '@/components/tree/family-link-edge';
import { Button } from '@/components/ui/button';
import { computeGenerations, layoutFamily, type LayoutDimensions } from '@/lib/family-layout';
import { displayPersonName } from '@/lib/person-name';
import { familyEdges } from '@/lib/tree-layout';
import { cn } from '@/lib/utils';
import type { FamilyTreeResponse, Person } from '@/types/family-tree';
import { yearOf } from '@/lib/partial-date';

type Blocked = { kind: 'assigned' | 'inside' | 'contains'; owner: string };

type PickerNodeData = {
  person: Person;
  current: boolean;
  blocked: Blocked | null;
  selected: boolean;
  onPick: (personId: string) => void;
};

type PickerFlowNode = Node<PickerNodeData, 'pickerPerson'>;

export type ClaimedBranch = { rootPersonId: string; owner: string };

const DIMENSIONS: LayoutDimensions = {
  nodeWidth: 168,
  spouseGap: 48,
  siblingGap: 28,
  generationGap: 190,
};

const LINK_STYLE = { stroke: '#9a6b2f', strokeWidth: 1.6 };

function years(person: Person): string {
  const birth = yearOf(person.birthDate) ?? undefined;
  const death = yearOf(person.deathDate) ?? undefined;
  if (!birth && !death) return '';
  return `${birth ?? '?'} – ${death ?? (person.isAlive ? 'nay' : '?')}`;
}

function blockedLabel(blocked: Blocked): string {
  if (blocked.kind === 'assigned') return `Gốc chi của ${blocked.owner}`;
  if (blocked.kind === 'inside') return `Thuộc chi của ${blocked.owner}`;
  return `Chứa chi của ${blocked.owner}`;
}

function PickerPersonNode({ data }: NodeProps<PickerFlowNode>) {
  const { person, current, blocked, selected } = data;
  const disabled = current || blocked !== null;
  return (
    <div className="relative w-[168px]">
      <Handle id="parent-target" type="target" position={Position.Top} className="!opacity-0" />
      <Handle id="spouse-target" type="target" position={Position.Left} className="!opacity-0" />
      <button
        type="button"
        disabled={disabled}
        aria-pressed={selected}
        onClick={() => data.onPick(person.id)}
        className={cn(
          'block w-full rounded-2xl border px-3 py-3 text-left shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700',
          selected
            ? 'scale-[1.04] border-brand-700 bg-brand-50 ring-4 ring-brand-500/30'
            : current
              ? 'border-brand-600 bg-brand-100'
              : blocked
                ? 'cursor-not-allowed border-stone-200 bg-stone-100 opacity-70'
                : 'border-gold-700/30 bg-[var(--card)] hover:border-brand-700 hover:bg-brand-50/60',
        )}
      >
        {person.honorific ? (
          <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-amber-800">
            {person.honorific}
          </span>
        ) : null}
        <span
          className="block truncate font-semibold text-brand-950"
          title={displayPersonName(person.name)}
        >
          {displayPersonName(person.name)}
        </span>
        <span className="block h-4 text-xs text-stone-500">{years(person)}</span>
        {current || blocked ? (
          <span
            className={cn(
              'mt-1.5 block truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium',
              current ? 'bg-brand-600 text-white' : 'bg-stone-200 text-stone-600',
            )}
          >
            {current ? 'Đang quản lý' : blockedLabel(blocked!)}
          </span>
        ) : null}
      </button>
      <Handle id="spouse-source" type="source" position={Position.Right} className="!opacity-0" />
      <Handle id="child-source" type="source" position={Position.Bottom} className="!opacity-0" />
      <Handle
        id="bracket-target"
        type="target"
        position={Position.Bottom}
        className="!size-0 !opacity-0"
      />
    </div>
  );
}

const nodeTypes = { pickerPerson: PickerPersonNode } satisfies NodeTypes;

function blockedPeople(
  tree: FamilyTreeResponse,
  claimed: readonly ClaimedBranch[],
): Map<string, Blocked> {
  const byId = new Map(tree.people.map((person) => [person.id, person]));
  const childrenOf = new Map<string, string[]>();
  for (const person of tree.people) {
    for (const parentId of [person.fatherId, person.motherId]) {
      if (!parentId) continue;
      childrenOf.set(parentId, [...(childrenOf.get(parentId) ?? []), person.id]);
    }
  }
  const spousesOf = (id: string): string[] =>
    tree.relationships.flatMap((relationship) =>
      relationship.husbandId === id
        ? [relationship.wifeId]
        : relationship.wifeId === id
          ? [relationship.husbandId]
          : [],
    );

  const blocked = new Map<string, Blocked>();
  const mark = (id: string, value: Blocked): void => {
    if (!blocked.has(id)) blocked.set(id, value);
  };
  for (const { rootPersonId, owner } of claimed) {
    mark(rootPersonId, { kind: 'assigned', owner });

    const lineage = new Set<string>();
    const down = [rootPersonId];
    while (down.length) {
      const id = down.pop()!;
      if (lineage.has(id)) continue;
      lineage.add(id);
      down.push(...(childrenOf.get(id) ?? []));
    }
    for (const id of lineage) {
      mark(id, { kind: 'inside', owner });
      spousesOf(id).forEach((spouseId) => mark(spouseId, { kind: 'inside', owner }));
    }

    const seen = new Set<string>();
    const up = [rootPersonId, ...spousesOf(rootPersonId)];
    while (up.length) {
      const id = up.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      mark(id, { kind: 'contains', owner });
      const person = byId.get(id);
      for (const parentId of [person?.fatherId, person?.motherId]) {
        if (!parentId) continue;
        up.push(parentId);
        spousesOf(parentId).forEach((spouseId) => up.push(spouseId));
      }
    }
  }
  return blocked;
}

export function BranchRootPicker(props: {
  tree: FamilyTreeResponse;
  accountName: string;
  currentRootIds: readonly string[];
  claimed: readonly ClaimedBranch[];
  saving: boolean;
  onConfirm: (personId: string) => void;
  onClose: () => void;
}) {
  return (
    <ReactFlowProvider>
      <BranchRootPickerDialog {...props} />
    </ReactFlowProvider>
  );
}

function BranchRootPickerDialog({
  tree,
  accountName,
  currentRootIds,
  claimed,
  saving,
  onConfirm,
  onClose,
}: Parameters<typeof BranchRootPicker>[0]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const close = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const blocked = useMemo(() => blockedPeople(tree, claimed), [claimed, tree]);
  const current = useMemo(() => new Set(currentRootIds), [currentRootIds]);

  const { nodes, edges } = useMemo(() => {
    const relationships = tree.relationships.map((relationship) => ({
      husbandId: relationship.husbandId,
      wifeId: relationship.wifeId,
      wifeOrder: relationship.wifeOrder ?? 1,
    }));
    const basePeople = tree.people.map((person) => ({
      id: person.id,
      name: person.name,
      gender: person.gender,
      fatherId: person.fatherId,
      motherId: person.motherId,
      generation: person.generation ?? 1,
      orderInFamily: person.orderInFamily ?? 1,
    }));
    const generations = computeGenerations(basePeople, relationships);
    const layout = layoutFamily(
      {
        people: basePeople.map((person) => ({
          ...person,
          generation: generations.get(person.id) ?? 1,
        })),
        relationships,
      },
      DIMENSIONS,
    );
    const flowNodes = tree.people.map<PickerFlowNode>((person) => ({
      id: person.id,
      type: 'pickerPerson',
      position: layout.positions.get(person.id) ?? { x: 0, y: 0 },
      draggable: false,
      data: {
        person,
        current: current.has(person.id),
        blocked: current.has(person.id) ? null : (blocked.get(person.id) ?? null),
        selected: person.id === selectedId,
        onPick: setSelectedId,
      },
    }));
    return { nodes: flowNodes, edges: familyEdges(layout, LINK_STYLE) };
  }, [blocked, current, selectedId, tree]);

  const selected = selectedId ? tree.people.find((person) => person.id === selectedId) : null;

  return (
    <div className="fixed inset-0 z-[70] grid p-0 sm:p-4">
      <button
        type="button"
        className="ui-backdrop absolute inset-0 bg-stone-950/50 backdrop-blur-[2px]"
        aria-label="Đóng"
        tabIndex={-1}
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-root-picker-title"
        className="heritage-panel relative flex h-full w-full flex-col overflow-hidden shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-start gap-3 border-b border-gold-500/25 bg-gradient-to-b from-gold-50 to-[var(--card)] px-5 py-4 sm:px-6">
          <GitBranch className="mt-1 size-5 shrink-0 text-brand-700" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2
              id="branch-root-picker-title"
              className="font-display text-lg font-bold text-wood-800"
            >
              Giao chi cho {accountName}
            </h2>
            <p className="text-sm text-stone-600">
              Bấm vào người đứng đầu chi. Chi gồm người đó, toàn bộ con cháu và vợ/chồng của họ.
            </p>
          </div>
          <button
            type="button"
            className="grid size-9 shrink-0 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 bg-paper-deep">
          {tree.people.length === 0 ? (
            <p className="grid h-full place-items-center px-6 text-center text-sm text-stone-600">
              Cây gia phả chưa có thành viên nào. Hãy thêm thành viên trong trang thiết kế trước.
            </p>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={familyEdgeTypes}
              onNodeClick={(_, node) => {
                if (!node.data.current && !node.data.blocked) setSelectedId(node.id);
              }}
              nodesConnectable={false}
              nodesDraggable={false}
              elementsSelectable={false}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              minZoom={0.05}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
            />
          )}
        </div>

        <footer className="flex flex-col gap-3 border-t border-gold-500/25 bg-paper/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-stone-700">
            {selected ? (
              <>
                Người đứng đầu chi:{' '}
                <strong className="text-brand-950">{displayPersonName(selected.name)}</strong>
              </>
            ) : (
              'Chưa chọn người nào.'
            )}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="button"
              disabled={!selected || saving}
              onClick={() => selected && onConfirm(selected.id)}
            >
              {saving ? (
                <InlineLoader className="size-4" />
              ) : (
                <GitBranch className="size-4" aria-hidden="true" />
              )}
              Giao chi này
            </Button>
          </div>
        </footer>
      </section>
    </div>
  );
}
