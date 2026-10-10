import type { CSSProperties } from 'react';
import type { Edge, Node } from '@xyflow/react';

import {
  CHILD_BUS_OFFSET,
  CHILD_BUS_STEP,
  computeGenerations,
  layoutFamily,
  type FamilyLayout,
  type LayoutDimensions,
  type LayoutPerson,
  type RowDimensions,
} from '@/lib/family-layout';
import { familyMediaSrc } from '@/lib/media-api';
import { displayPersonName } from '@/lib/person-name';
import { backgroundTreeArea, fitPosterSheet, posterTreeRegion } from '@/lib/poster-geometry';
import type { FamilyPoster } from '@/lib/poster-decorations';
import type { FamilyTreeResponse, Gender } from '@/types/family-tree';
import { yearOf } from '@/lib/partial-date';

export type PersonNodeData = {
  name: string;
  honorific: string | null;
  gender: Gender;
  birthDate: string | null;
  lifespan: string;
  years: { birth: string; death: string | null } | null;
  generation: number;
  width: number;
  height: number;
  textScale: number;
  avatarSrc: string | null;
};

export type PersonFlowNode = Node<PersonNodeData, 'person'>;

export type PosterFrameNode = Node<
  {
    width: number;
    height: number;
    scale: number;
    settings: FamilyPoster;
    familyName: string;
  },
  'posterFrame'
>;
export type PosterFlowNode = PersonFlowNode | PosterFrameNode;

export type FamilyLinkData =
  | { kind: 'spouse' }
  | { kind: 'bracket'; drop: number }
  | { kind: 'child'; offsetX: number; offsetY: number; busOffset: number };

export type FamilyLinkEdgeType = Edge<FamilyLinkData, 'familyLink'>;

export type FamilyEdge = Edge | FamilyLinkEdgeType;

export const VIEWER_NODE_WIDTH = 288;
const LANDSCAPE_RATIO = 9 / 16;
const FOUNDER_CARD_RATIO = 0.3;
const FOUNDER_SCROLL_BOTTOM_GAP = 63 / 480;
const ROW_SCALE: Readonly<Record<number, number>> = { 1: 3, 2: 2, 3: 1.4 };
const CREST_HEIGHT_RATIO = (0.82 * 88) / 635;
const CREST_LINE_ROOM = 0.6;

export function cardBottomGap(data: Pick<PersonNodeData, 'generation' | 'height'>): number {
  return data.generation === 1 ? data.height * FOUNDER_SCROLL_BOTTOM_GAP : 0;
}

type ChildLinkEdge = FamilyLinkEdgeType & {
  data: Extract<FamilyLinkData, { kind: 'child' }>;
};

function isChildLink(edge: FamilyEdge): edge is ChildLinkEdge {
  return edge.type === 'familyLink' && (edge.data as FamilyLinkData | undefined)?.kind === 'child';
}

function crestHeight(generation: number, width: number): number {
  return generation === 2 || generation === 3 ? width * CREST_HEIGHT_RATIO : 0;
}
const MAX_CARD_RATIO = 1.1;
const CROWDED_ROW_SHARE = 0.6;
const MIN_VIEWER_NODE_WIDTH = 160;
const FULL_SIZE_MEMBER_LIMIT = 12;
const SHRINK_PER_MEMBER = 2;

const MAX_ROW_GROWTH = 2;

export type ViewerRow = RowDimensions & {
  nodeHeight: number;
  textScale: number;
  crowded: boolean;
};

type ViewerDimensions = Omit<LayoutDimensions, 'rowForGeneration'> & {
  nodeHeight: number;
  rowForGeneration: (generation: number) => ViewerRow;
};

function viewerDimensions(
  people: readonly LayoutPerson[],
  crowdedRatio = LANDSCAPE_RATIO,
): ViewerDimensions {
  const extraMembers = Math.max(0, people.length - FULL_SIZE_MEMBER_LIMIT);
  const nodeWidth = Math.max(
    MIN_VIEWER_NODE_WIDTH,
    VIEWER_NODE_WIDTH - extraMembers * SHRINK_PER_MEMBER,
  );
  const scale = nodeWidth / VIEWER_NODE_WIDTH;
  const landscapeRow: ViewerRow = {
    nodeWidth,
    nodeHeight: Math.round(nodeWidth * LANDSCAPE_RATIO),
    spouseGap: Math.round(40 * scale),
    siblingGap: Math.round(32 * scale),
    textScale: 1,
    crowded: false,
  };

  const rowCounts = new Map<number, number>();
  people.forEach((person) =>
    rowCounts.set(person.generation, (rowCounts.get(person.generation) ?? 0) + 1),
  );
  const busiestRow = Math.max(1, ...rowCounts.values());
  let growthAbove = MAX_ROW_GROWTH;
  const rows = new Map(
    [...rowCounts]
      .sort(([a], [b]) => a - b)
      .map(([generation, count]): [number, ViewerRow] => {
        const growth = Math.min(growthAbove, Math.sqrt(busiestRow / count));
        growthAbove = growth;
        const isFounderRow = generation === 1;
        const rowScale = ROW_SCALE[generation] ?? 1;
        const width = Math.round(nodeWidth * growth * rowScale);
        const crowded = !isFounderRow && count >= busiestRow * CROWDED_ROW_SHARE;
        const ratio = isFounderRow ? FOUNDER_CARD_RATIO : crowded ? crowdedRatio : LANDSCAPE_RATIO;
        return [
          generation,
          {
            ...landscapeRow,
            spouseGap: landscapeRow.spouseGap * rowScale,
            siblingGap: landscapeRow.siblingGap * rowScale,
            nodeWidth: width,
            nodeHeight: Math.round(width * ratio),
            textScale: width / nodeWidth,
            crowded,
          },
        ];
      }),
  );

  return {
    ...landscapeRow,
    rowForGeneration: (generation) => rows.get(generation) ?? landscapeRow,
    generationGap: Math.round(landscapeRow.nodeHeight + 110 * scale),
  };
}

const VIEWER_LINK_STYLE: CSSProperties = { stroke: '#7a1c1c', strokeWidth: 2 };

function year(value: string | null): string {
  return String(yearOf(value) ?? '?');
}

function years(birthDate: string | null, deathDate: string | null): PersonNodeData['years'] {
  if (!yearOf(birthDate) && !deathDate) return null;
  return { birth: year(birthDate), death: deathDate ? year(deathDate) : null };
}

function lifespan(birthDate: string | null, deathDate: string | null): string {
  if (!yearOf(birthDate) && !deathDate) return 'Chưa rõ năm sinh';
  return `${year(birthDate)} — ${deathDate ? year(deathDate) : 'nay'}`;
}

export function familyEdges(layout: FamilyLayout, style: CSSProperties): FamilyEdge[] {
  const marriageEdges = layout.marriages.map<FamilyEdge>((marriage) => {
    const id = 'spouse-' + marriage.husbandId + '-' + marriage.wifeId;
    return marriage.adjacent
      ? {
          id,
          source: marriage.leftId,
          sourceHandle: 'spouse-source',
          target: marriage.rightId,
          targetHandle: 'spouse-target',
          type: 'familyLink',
          data: { kind: 'spouse' },
          style,
        }
      : {
          id,
          source: marriage.leftId,
          sourceHandle: 'child-source',
          target: marriage.rightId,
          targetHandle: 'bracket-target',
          type: 'familyLink',
          data: { kind: 'bracket', drop: marriage.drop },
          style,
        };
  });

  const childEdges = layout.childLinks.map<FamilyLinkEdgeType>((link) => ({
    id: 'parent-' + link.sourceId + '-' + link.childId,
    source: link.sourceId,
    sourceHandle: link.sourceHandle,
    target: link.childId,
    targetHandle: 'parent-target',
    type: 'familyLink',
    data: {
      kind: 'child',
      offsetX: link.offsetX,
      offsetY: link.offsetY,
      busOffset: link.busOffset,
    },
    style,
  }));

  return [...marriageEdges, ...childEdges];
}

function cardRatioFor(
  people: readonly LayoutPerson[],
  positions: ReadonlyMap<string, { x: number; y: number }>,
  dimensions: ViewerDimensions,
  targetAspect: number,
): number {
  if (people.length === 0) return LANDSCAPE_RATIO;
  const lefts = people.map((person) => positions.get(person.id)?.x ?? 0);
  const rights = people.map(
    (person) =>
      (positions.get(person.id)?.x ?? 0) + dimensions.rowForGeneration(person.generation).nodeWidth,
  );
  const treeWidth = Math.max(...rights) - Math.min(...lefts);
  const rows = [...new Set(people.map((person) => person.generation))].map((generation) =>
    dimensions.rowForGeneration(generation),
  );
  const crowdedWidths = rows
    .filter((row) => row.crowded)
    .reduce((total, row) => total + row.nodeWidth, 0);
  if (crowdedWidths === 0) return LANDSCAPE_RATIO;
  const landscapeHeights = rows
    .filter((row) => !row.crowded)
    .reduce((total, row) => total + row.nodeHeight, 0);
  const spacing = (rows.length - 1) * (dimensions.generationGap - dimensions.nodeHeight);
  const ratio = (treeWidth / targetAspect - spacing - landscapeHeights) / crowdedWidths;
  return Math.min(MAX_CARD_RATIO, Math.max(LANDSCAPE_RATIO, ratio));
}

export function toFlowElements(
  tree: FamilyTreeResponse,
  familySlug: string,
  targetAspect?: number,
): {
  nodes: PersonFlowNode[];
  edges: FamilyEdge[];
  dimensions: ViewerDimensions;
} {
  const relationships = tree.relationships.map((relationship) => ({
    husbandId: relationship.husbandId,
    wifeId: relationship.wifeId,
    wifeOrder: relationship.wifeOrder ?? 1,
  }));
  const basePeople: LayoutPerson[] = tree.people.map((person) => ({
    id: person.id,
    name: person.name,
    gender: person.gender,
    fatherId: person.fatherId,
    motherId: person.motherId,
    generation: person.generation ?? 1,
    orderInFamily: person.orderInFamily ?? 1,
  }));
  const generations = computeGenerations(basePeople, relationships);
  const people = basePeople.map((person) => ({
    ...person,
    generation: generations.get(person.id) ?? 1,
  }));
  const widthDimensions = viewerDimensions(people);
  const layout = layoutFamily({ people, relationships }, widthDimensions);
  const dimensions = targetAspect
    ? viewerDimensions(
        people,
        cardRatioFor(people, layout.positions, widthDimensions, targetAspect),
      )
    : widthDimensions;

  const nodes = tree.people.map<PersonFlowNode>((person) => {
    const generation = generations.get(person.id) ?? 1;
    const row = dimensions.rowForGeneration(generation);
    return {
      id: person.id,
      type: 'person',
      position: layout.positions.get(person.id) ?? { x: 0, y: 0 },
      data: {
        name: displayPersonName(person.name),
        honorific: person.honorific,
        gender: person.gender,
        birthDate: person.birthDate,
        lifespan: lifespan(person.birthDate, person.deathDate),
        years: years(person.birthDate, person.deathDate),
        generation,
        width: row.nodeWidth,
        height: row.nodeHeight,
        textScale: row.textScale,
        avatarSrc: person.avatarUrl ? familyMediaSrc(familySlug, person.avatarUrl) : null,
      },
    };
  });

  return { nodes, edges: familyEdges(layout, VIEWER_LINK_STYLE), dimensions };
}

const POSTER_RATIO = 16 / 9;
const MAX_ROW_SPACING = 420;
const DECORATION_BASE_WIDTH = 1600;

const POSTER_LINK_STYLE: CSSProperties = { stroke: '#7a1c1c', strokeWidth: 2.5 };

export function toPosterElements(
  tree: FamilyTreeResponse,
  family: { name: string; poster: FamilyPoster },
  familySlug: string,
): { nodes: PosterFlowNode[]; edges: FamilyEdge[] } {
  const posterTreeArea = backgroundTreeArea(family.poster);
  const regionAspect = posterTreeArea
    ? (POSTER_RATIO * (1 - posterTreeArea.left - posterTreeArea.right)) /
      (1 - posterTreeArea.top - posterTreeArea.bottom)
    : POSTER_RATIO;
  const { nodes: personNodes, edges, dimensions } = toFlowElements(tree, familySlug, regionAspect);
  const edgesOnPoster = edges.map((edge) => ({ ...edge, style: POSTER_LINK_STYLE }));
  if (personNodes.length === 0) return { nodes: [], edges: [] };

  const generationCount = Math.max(...personNodes.map((node) => node.data.generation));
  const minX = Math.min(...personNodes.map((node) => node.position.x));
  const maxX = Math.max(...personNodes.map((node) => node.position.x + node.data.width));
  const treeWidth = maxX - minX;
  const rowHeights = Array.from(
    { length: generationCount },
    (_, index) => dimensions.rowForGeneration(index + 1).nodeHeight,
  );
  const rowsHeight = rowHeights.reduce((total, height) => total + height, 0);

  const scale = Math.max(1, treeWidth / DECORATION_BASE_WIDTH);
  const baseSpacing = dimensions.generationGap - dimensions.nodeHeight;
  const treeArea = posterTreeArea;
  const crestRoom = rowHeights.map((_, index) => {
    const generation = index + 1;
    const crest = crestHeight(generation, dimensions.rowForGeneration(generation).nodeWidth);
    return crest > 0 ? crest + baseSpacing * CREST_LINE_ROOM : 0;
  });
  const crestExtra = crestRoom.reduce((total, room) => total + Math.max(0, room - baseSpacing), 0);

  const { width: frameWidth, height: frameHeight } = fitPosterSheet(
    treeArea,
    scale,
    {
      width: treeWidth,
      height: rowsHeight + (generationCount - 1) * baseSpacing + crestExtra,
    },
    POSTER_RATIO,
  );
  const region = posterTreeRegion(frameWidth, frameHeight, scale, treeArea);

  const treeRoom = frameHeight - region.top - region.bottom;
  const neededSpacing =
    generationCount > 1
      ? (treeRoom - rowsHeight - crestExtra) / (generationCount - 1)
      : baseSpacing;
  const rowSpacing = Math.min(MAX_ROW_SPACING * scale, Math.max(baseSpacing, neededSpacing));
  const rowTops = rowHeights.map((_, index) =>
    rowHeights
      .slice(0, index)
      .reduce(
        (total, height, above) => total + height + Math.max(rowSpacing, crestRoom[above + 1] ?? 0),
        0,
      ),
  );

  const people = personNodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x,
      y: rowTops[node.data.generation - 1] ?? 0,
    },
  }));

  const generationOf = new Map(people.map((node) => [node.id, node.data.generation]));
  const edgesWithBuses = edgesOnPoster.map((edge) => {
    const generation = generationOf.get(edge.target);
    if (!isChildLink(edge) || !generation || generation < 2) return edge;
    const childTop = rowTops[generation - 1] ?? 0;
    const parentRow = dimensions.rowForGeneration(generation - 1);
    const gapTop =
      (rowTops[generation - 2] ?? 0) +
      parentRow.nodeHeight -
      cardBottomGap({ generation: generation - 1, height: parentRow.nodeHeight });
    const gapBottom =
      childTop - crestHeight(generation, dimensions.rowForGeneration(generation).nodeWidth);
    const step = Math.round((edge.data.busOffset - CHILD_BUS_OFFSET) / CHILD_BUS_STEP);
    const stagger = (step === 1 ? 1 : step === 2 ? -1 : 0) * CHILD_BUS_STEP;
    return {
      ...edge,
      data: { ...edge.data, busOffset: childTop - (gapTop + gapBottom) / 2 - stagger },
    };
  });

  const regionCenter = (region.left + frameWidth - region.right) / 2;

  const frame: PosterFrameNode = {
    id: 'poster-frame',
    type: 'posterFrame',
    position: { x: (minX + maxX) / 2 - regionCenter, y: -region.top },
    data: {
      width: frameWidth,
      height: frameHeight,
      scale,
      settings: family.poster,
      familyName: family.name,
    },
    zIndex: -1,
    selectable: false,
    focusable: false,
  };

  return { nodes: [frame, ...people], edges: edgesWithBuses };
}
