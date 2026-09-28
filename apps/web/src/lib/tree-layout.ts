import type { CSSProperties } from 'react';
import type { Edge, Node } from '@xyflow/react';

import {
  computeGenerations,
  layoutFamily,
  type FamilyLayout,
  type LayoutDimensions,
  type LayoutPerson,
} from '@/lib/family-layout';
import { familyMediaSrc } from '@/lib/media-api';
import type { FamilySummary, FamilyTreeResponse, Gender } from '@/types/family-tree';

export type PersonNodeData = {
  name: string;
  honorific: string | null;
  gender: Gender;
  birthDate: string | null;
  lifespan: string;
  generation: number;
  /** Resolved photo URL, or null for the gender placeholder. */
  avatarSrc: string | null;
};

export type PersonFlowNode = Node<PersonNodeData, 'person'>;

export type PosterFrameNode = Node<{ width: number; height: number }, 'posterFrame'>;
export type PosterTitleNode = Node<
  { heading: string; familyName: string; subtitle: string | null; width: number },
  'posterTitle'
>;
export type GenerationLabelNode = Node<{ generation: number; label: string }, 'generationLabel'>;
export type CoupletNode = Node<{ words: string[]; height: number }, 'couplet'>;

export type PosterFlowNode =
  | PersonFlowNode
  | PosterFrameNode
  | PosterTitleNode
  | GenerationLabelNode
  | CoupletNode;

export type FamilyLinkData =
  | { kind: 'bracket'; drop: number }
  | { kind: 'child'; offsetX: number; offsetY: number; busOffset: number };

export type FamilyLinkEdgeType = Edge<FamilyLinkData, 'familyLink'>;

export type FamilyEdge = Edge | FamilyLinkEdgeType;

/** Framed 16:9 cards: 288 × 162, plus the Đời 1 crest above. */
export const VIEWER_NODE_WIDTH = 288;

const VIEWER_DIMENSIONS: LayoutDimensions = {
  nodeWidth: VIEWER_NODE_WIDTH,
  spouseGap: 56,
  siblingGap: 36,
  generationGap: 300,
};

const VIEWER_LINK_STYLE: CSSProperties = { stroke: '#a07a2c', strokeWidth: 2 };

function year(value: string | null): string {
  return value ? new Date(value).getUTCFullYear().toString() : '?';
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
          type: 'straight',
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

export function toFlowElements(
  tree: FamilyTreeResponse,
  familySlug: string,
): {
  nodes: PersonFlowNode[];
  edges: FamilyEdge[];
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
  const layout = layoutFamily({ people, relationships }, VIEWER_DIMENSIONS);

  const nodes = tree.people.map<PersonFlowNode>((person) => ({
    id: person.id,
    type: 'person',
    position: layout.positions.get(person.id) ?? { x: 0, y: 0 },
    data: {
      name: person.name,
      honorific: person.honorific,
      gender: person.gender,
      birthDate: person.birthDate,
      lifespan: lifespan(person.birthDate, person.deathDate),
      generation: generations.get(person.id) ?? 1,
      avatarSrc: person.avatarUrl ? familyMediaSrc(familySlug, person.avatarUrl) : null,
    },
  }));

  return { nodes, edges: familyEdges(layout, VIEWER_LINK_STYLE) };
}

/** Poster geometry around the tree, in canvas pixels. */
const NODE_HEIGHT = (VIEWER_NODE_WIDTH * 9) / 16;
const CREST_HEIGHT = 36;
const TITLE_HEIGHT = 190;
const TITLE_GAP = 70;
const LABEL_WIDTH = 320;
const LABEL_HEIGHT = 56;
const LABEL_GAP = 60;
const COUPLET_WIDTH = 96;
const COUPLET_GAP = 70;
const FRAME_PADDING = 90;
const POSTER_RATIO = 16 / 9;
const MAX_GENERATION_GAP = 720;

const POSTER_LINK_STYLE: CSSProperties = { stroke: '#2f6b3a', strokeWidth: 2.5 };

export const POSTER_COUPLETS = {
  left: 'Công đức tổ tiên muôn đời thịnh',
  right: 'Hiếu trung con cháu vạn thuở vinh',
} as const;

function generationLabel(generation: number): string {
  return generation === 1 ? 'Đời 1: Thủy tổ' : 'Đời ' + generation;
}

/**
 * The tree drawn as a traditional phả đồ: a 16:9 poster with a title banner,
 * a generation label beside every row and a couplet down each side. Rows are
 * spread vertically so wide trees still fill the 16:9 sheet.
 */
export function toPosterElements(
  tree: FamilyTreeResponse,
  family: Pick<FamilySummary, 'name' | 'ancestryOrigin' | 'address'>,
  familySlug: string,
): { nodes: PosterFlowNode[]; edges: FamilyEdge[] } {
  const { nodes: personNodes, edges } = toFlowElements(tree, familySlug);
  const edgesOnPoster = edges.map((edge) => ({ ...edge, style: POSTER_LINK_STYLE }));
  if (personNodes.length === 0) return { nodes: [], edges: [] };

  const generationCount = Math.max(...personNodes.map((node) => node.data.generation));
  const minX = Math.min(...personNodes.map((node) => node.position.x));
  const maxX = Math.max(...personNodes.map((node) => node.position.x)) + VIEWER_NODE_WIDTH;

  const contentLeft = minX - LABEL_GAP - LABEL_WIDTH - COUPLET_GAP - COUPLET_WIDTH;
  const contentRight = maxX + COUPLET_GAP + COUPLET_WIDTH;
  const width = contentRight - contentLeft + FRAME_PADDING * 2;
  const verticalExtras =
    FRAME_PADDING * 2 + TITLE_HEIGHT + TITLE_GAP + CREST_HEIGHT + NODE_HEIGHT;

  // Stretch the rows (never squeeze them) so the sheet reaches 16:9.
  const baseGap = VIEWER_DIMENSIONS.generationGap;
  const neededGap =
    generationCount > 1
      ? (width / POSTER_RATIO - verticalExtras) / (generationCount - 1)
      : baseGap;
  const generationGap = Math.min(MAX_GENERATION_GAP, Math.max(baseGap, neededGap));
  const treeHeight = (generationCount - 1) * generationGap + NODE_HEIGHT;

  let frameWidth = width;
  let frameHeight = verticalExtras - NODE_HEIGHT + treeHeight;
  // Whichever side is short grows; the content stays centered on the sheet.
  if (frameWidth / frameHeight < POSTER_RATIO) frameWidth = frameHeight * POSTER_RATIO;
  else frameHeight = frameWidth / POSTER_RATIO;

  const naturalHeight = verticalExtras - NODE_HEIGHT + treeHeight;
  const treeCenter = (minX + maxX) / 2;
  const frameX = (contentLeft + contentRight) / 2 - frameWidth / 2;
  const treeTop = 0;
  const titleY = treeTop - CREST_HEIGHT - TITLE_GAP - TITLE_HEIGHT;
  const frameY = titleY - FRAME_PADDING - (frameHeight - naturalHeight) / 2;
  const titleWidth = Math.min(1100, Math.max(760, (maxX - minX) * 0.6));

  const people = personNodes.map((node) => ({
    ...node,
    position: { x: node.position.x, y: (node.data.generation - 1) * generationGap },
  }));

  const labels = Array.from({ length: generationCount }, (_, index): GenerationLabelNode => ({
    id: 'generation-label-' + (index + 1),
    type: 'generationLabel',
    position: {
      x: minX - LABEL_GAP - LABEL_WIDTH,
      y: index * generationGap + NODE_HEIGHT / 2 - LABEL_HEIGHT / 2,
    },
    data: { generation: index + 1, label: generationLabel(index + 1) },
    selectable: false,
  }));

  const coupletTop = titleY + TITLE_HEIGHT / 2;
  const coupletHeight = treeTop + treeHeight - coupletTop;
  const couplets: CoupletNode[] = [
    {
      id: 'couplet-left',
      type: 'couplet',
      position: { x: frameX + FRAME_PADDING, y: coupletTop },
      data: { words: POSTER_COUPLETS.left.split(' '), height: coupletHeight },
      selectable: false,
    },
    {
      id: 'couplet-right',
      type: 'couplet',
      position: { x: frameX + frameWidth - FRAME_PADDING - COUPLET_WIDTH, y: coupletTop },
      data: { words: POSTER_COUPLETS.right.split(' '), height: coupletHeight },
      selectable: false,
    },
  ];

  const frame: PosterFrameNode = {
    id: 'poster-frame',
    type: 'posterFrame',
    position: { x: frameX, y: frameY },
    data: { width: frameWidth, height: frameHeight },
    zIndex: -1,
    selectable: false,
    focusable: false,
  };

  const title: PosterTitleNode = {
    id: 'poster-title',
    type: 'posterTitle',
    position: { x: treeCenter - titleWidth / 2, y: titleY },
    data: {
      heading: 'Phả đồ',
      familyName: family.name,
      subtitle: family.ancestryOrigin ?? family.address,
      width: titleWidth,
    },
    selectable: false,
  };

  return {
    nodes: [frame, title, ...couplets, ...labels, ...people],
    edges: edgesOnPoster,
  };
}
