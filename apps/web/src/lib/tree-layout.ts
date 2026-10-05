import type { CSSProperties } from 'react';
import type { Edge, Node } from '@xyflow/react';

import {
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

export type PersonNodeData = {
  name: string;
  honorific: string | null;
  gender: Gender;
  birthDate: string | null;
  lifespan: string;
  /** Birth and death years, or null when neither date is known. */
  years: { birth: string; death: string | null } | null;
  generation: number;
  /** Card size in canvas pixels. */
  width: number;
  height: number;
  /** Text size relative to the tree's base card; sparse rows read larger. */
  textScale: number;
  /** Resolved photo URL, or null for the gender placeholder. */
  avatarSrc: string | null;
};

export type PersonFlowNode = Node<PersonNodeData, 'person'>;

export type PosterFrameNode = Node<
  {
    width: number;
    height: number;
    /** Size of the decoration relative to a 1600px-wide tree. */
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

/** Framed 16:9 cards are 288 × 162 at full size; busy trees shrink them. */
export const VIEWER_NODE_WIDTH = 288;
const LANDSCAPE_RATIO = 9 / 16;
/**
 * The tallest a crowded row's card may get relative to its width. Wide trees
 * leave spare height on the 16:9 sheet; taller cards in the crowded rows use
 * it, so their names can wrap onto more lines and read larger.
 */
const MAX_CARD_RATIO = 1.1;
/**
 * A row is crowded, and may use taller cards, when it holds at least this
 * share of the busiest row's people. Other rows keep landscape cards.
 */
const CROWDED_ROW_SHARE = 0.6;
/** The Đời 1 crest stands above the founders' frames: 36px tall on a 288px card. */
const CREST_RATIO = 36 / 288;
const MIN_VIEWER_NODE_WIDTH = 160;
/** Trees up to this size keep full-size cards; larger ones shrink step by step. */
const FULL_SIZE_MEMBER_LIMIT = 12;
const SHRINK_PER_MEMBER = 2;

/** A sparse row's cards may grow up to this multiple of the base card. */
const MAX_ROW_GROWTH = 2;

export type ViewerRow = RowDimensions & {
  nodeHeight: number;
  textScale: number;
  /** Nearly as busy as the busiest row: its cards may be taller than landscape. */
  crowded: boolean;
};

/**
 * Busy trees get smaller cards so names stay legible once the whole poster is
 * fitted to the screen. The busiest row keeps the base size and sparser rows
 * grow so their names read larger, but a generation is never larger than the
 * one above it, so cards shrink steadily from the ancestors down instead of
 * jumping in size. Rows keep landscape cards unless they are crowded; crowded
 * rows use `crowdedRatio`.
 */
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
        const width = Math.round(nodeWidth * growth);
        const crowded = count >= busiestRow * CROWDED_ROW_SHARE;
        return [
          generation,
          {
            ...landscapeRow,
            nodeWidth: width,
            nodeHeight: Math.round(width * (crowded ? crowdedRatio : LANDSCAPE_RATIO)),
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

const VIEWER_LINK_STYLE: CSSProperties = { stroke: '#c8102e', strokeWidth: 2 };

function year(value: string | null): string {
  return value ? new Date(value).getUTCFullYear().toString() : '?';
}

function years(birthDate: string | null, deathDate: string | null): PersonNodeData['years'] {
  if (!birthDate && !deathDate) return null;
  return { birth: year(birthDate), death: deathDate ? year(deathDate) : null };
}

function lifespan(birthDate: string | null, deathDate: string | null): string {
  if (!birthDate && !deathDate) return 'Chưa rõ năm sinh';
  return `${year(birthDate)} — ${deathDate ? year(deathDate) : 'nay'}`;
}

/**
 * Marriage lines plus child lines that leave from the middle of each couple's
 * marriage line. Handle ids match the designer and viewer person nodes.
 */
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

/**
 * The crowded rows' card shape (height ÷ width) at which the laid-out tree's
 * width ÷ height matches `targetAspect`, between landscape and slightly taller
 * than square. The other rows stay landscape and count as they are.
 */
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
  const crest = dimensions.rowForGeneration(1).nodeWidth * CREST_RATIO;
  const spacing = (rows.length - 1) * (dimensions.generationGap - dimensions.nodeHeight);
  const ratio = (treeWidth / targetAspect - crest - spacing - landscapeHeights) / crowdedWidths;
  return Math.min(MAX_CARD_RATIO, Math.max(LANDSCAPE_RATIO, ratio));
}

export function toFlowElements(
  tree: FamilyTreeResponse,
  familySlug: string,
  /** Width ÷ height of the space the tree is drawn in; shapes the cards to fill it. */
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
  // Card heights do not move anything sideways, so lay out once with the
  // widths, then pick the card shape that best fills the target space.
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
/** Largest gap between rows at decoration scale 1; it grows with the sheet. */
const MAX_ROW_SPACING = 420;
/** Trees wider than this get proportionally larger decoration. */
const DECORATION_BASE_WIDTH = 1600;

const POSTER_LINK_STYLE: CSSProperties = { stroke: '#c8102e', strokeWidth: 2.5 };

/**
 * The tree drawn as a traditional phả đồ on the family's background, inside
 * the tree area the ADMIN marked on it (or inside the frame band). Rows are
 * spread vertically so the tree fills that area.
 */
export function toPosterElements(
  tree: FamilyTreeResponse,
  family: { name: string; poster: FamilyPoster },
  familySlug: string,
): { nodes: PosterFlowNode[]; edges: FamilyEdge[] } {
  const posterTreeArea = backgroundTreeArea(family.poster);
  // The tree region's own shape on the 16:9 sheet; without a marked area the
  // frame band leaves roughly the sheet's shape.
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
  const crestHeight = dimensions.rowForGeneration(1).nodeWidth * CREST_RATIO;
  const baseSpacing = dimensions.generationGap - dimensions.nodeHeight;
  const treeArea = posterTreeArea;

  // The smallest 16:9 sheet whose tree region holds the tree at its tightest spacing.
  const { width: frameWidth, height: frameHeight } = fitPosterSheet(
    treeArea,
    scale,
    {
      width: treeWidth,
      height: crestHeight + rowsHeight + (generationCount - 1) * baseSpacing,
    },
    POSTER_RATIO,
  );
  const region = posterTreeRegion(frameWidth, frameHeight, scale, treeArea);

  // Stretch the space between rows (never squeeze it) into the room the ratio left.
  // The tree starts at the top of its region; spare height goes below it.
  const treeRoom = frameHeight - region.top - region.bottom;
  const neededSpacing =
    generationCount > 1
      ? (treeRoom - crestHeight - rowsHeight) / (generationCount - 1)
      : baseSpacing;
  const rowSpacing = Math.min(MAX_ROW_SPACING * scale, Math.max(baseSpacing, neededSpacing));
  const rowTops = rowHeights.map((_, index) =>
    rowHeights.slice(0, index).reduce((total, height) => total + height + rowSpacing, 0),
  );

  const people = personNodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x,
      y: crestHeight + (rowTops[node.data.generation - 1] ?? 0),
    },
  }));

  // The tree is centered in its region, which may sit off-center on the background.
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

  return { nodes: [frame, ...people], edges: edgesOnPoster };
}
