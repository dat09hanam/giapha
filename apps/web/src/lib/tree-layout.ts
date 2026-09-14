import { MarkerType, type Edge, type Node } from '@xyflow/react';

import type { FamilyTreeResponse, Gender } from '@/types/family-tree';

export type PersonNodeData = {
  displayName: string;
  gender: Gender;
  lifespan: string;
  generation: number;
};

export type PersonFlowNode = Node<PersonNodeData, 'person'>;

const NODE_WIDTH = 220;
const HORIZONTAL_GAP = 72;
const VERTICAL_GAP = 190;

function year(value: string | null): string {
  return value ? new Date(value).getUTCFullYear().toString() : '?';
}

function lifespan(birthDate: string | null, deathDate: string | null): string {
  if (!birthDate && !deathDate) return 'Chưa rõ năm sinh';
  return `${year(birthDate)} — ${deathDate ? year(deathDate) : 'nay'}`;
}

function calculateGenerations(tree: FamilyTreeResponse): Map<string, number> {
  const generations = new Map(
    tree.people.map((person) => [person.id, Math.max(0, person.generation ?? 0)]),
  );

  for (let pass = 0; pass < tree.people.length; pass += 1) {
    let changed = false;

    for (const relationship of tree.parentChildRelationships) {
      const parentGeneration = generations.get(relationship.parentId) ?? 0;
      const currentChildGeneration = generations.get(relationship.childId) ?? 0;
      const nextChildGeneration = Math.max(currentChildGeneration, parentGeneration + 1);

      if (nextChildGeneration !== currentChildGeneration) {
        generations.set(relationship.childId, nextChildGeneration);
        changed = true;
      }
    }

    if (!changed) break;
  }

  return generations;
}

export function toFlowElements(tree: FamilyTreeResponse): {
  nodes: PersonFlowNode[];
  edges: Edge[];
} {
  const generations = calculateGenerations(tree);
  const rows = new Map<number, typeof tree.people>();

  for (const person of tree.people) {
    const generation = generations.get(person.id) ?? 0;
    rows.set(generation, [...(rows.get(generation) ?? []), person]);
  }

  const nodes = [...rows.entries()].flatMap(([generation, people]) => {
    const rowWidth = people.length * NODE_WIDTH + Math.max(0, people.length - 1) * HORIZONTAL_GAP;

    return people.map<PersonFlowNode>((person, index) => ({
      id: person.id,
      type: 'person',
      position: {
        x: index * (NODE_WIDTH + HORIZONTAL_GAP) - rowWidth / 2 + NODE_WIDTH / 2,
        y: generation * VERTICAL_GAP,
      },
      data: {
        displayName: person.displayName,
        gender: person.gender,
        lifespan: lifespan(person.birthDate, person.deathDate),
        generation: generation + 1,
      },
    }));
  });

  const parentEdges: Edge[] = tree.parentChildRelationships.map((relationship) => ({
    id: relationship.id,
    source: relationship.parentId,
    target: relationship.childId,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#4d7460' },
    style: { stroke: '#4d7460', strokeWidth: 1.6 },
  }));

  const partnershipEdges: Edge[] = tree.partnerships.map((partnership) => ({
    id: partnership.id,
    source: partnership.partnerAId,
    target: partnership.partnerBId,
    type: 'straight',
    label: 'phối ngẫu',
    style: { stroke: '#b38143', strokeDasharray: '6 4', strokeWidth: 1.5 },
    labelStyle: { fill: '#7c5a30', fontSize: 10 },
  }));

  return { nodes, edges: [...parentEdges, ...partnershipEdges] };
}
