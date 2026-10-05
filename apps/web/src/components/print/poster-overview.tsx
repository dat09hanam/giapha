import { useMemo } from 'react';

import { familyLinkPath } from '@/components/tree/family-link-edge';
import { PersonCard } from '@/components/tree/person-node';
import { PosterSheet } from '@/components/tree/poster-art';
import type { FamilyPoster } from '@/lib/poster-decorations';
import {
  toPosterElements,
  type FamilyLinkData,
  type PersonFlowNode,
  type PosterFrameNode,
} from '@/lib/tree-layout';
import type { FamilyTreeResponse } from '@/types/family-tree';

type Point = { x: number; y: number };

/** Where each person-node handle sits on the card, as the canvas places them. */
function handlePoint(node: PersonFlowNode, origin: Point, handleId: string | null | undefined): Point {
  const left = node.position.x - origin.x;
  const top = node.position.y - origin.y;
  const { width, height } = node.data;
  switch (handleId) {
    case 'spouse-target':
      return { x: left, y: top + height / 2 };
    case 'spouse-source':
      return { x: left + width, y: top + height / 2 };
    case 'child-source':
    case 'bracket-target':
      return { x: left + width / 2, y: top + height };
    default:
      return { x: left + width / 2, y: top };
  }
}

/**
 * The whole phả đồ as the viewer shows it, on the family's decorated sheet, fitted into
 * `width` × `height`. Drawn without React Flow, whose measuring would be thrown off by the
 * scaled print preview.
 */
export function PosterOverview({
  tree,
  family,
  familySlug,
  width,
  height,
}: {
  tree: FamilyTreeResponse;
  family: { name: string; poster: FamilyPoster };
  familySlug: string;
  width: number;
  height: number;
}) {
  const poster = useMemo(() => {
    const { nodes, edges } = toPosterElements(tree, family, familySlug);
    const frame = nodes.find((node): node is PosterFrameNode => node.type === 'posterFrame');
    if (!frame) return null;
    const people = nodes.filter((node): node is PersonFlowNode => node.type === 'person');
    const byId = new Map(people.map((node) => [node.id, node]));
    const lines = edges.flatMap((edge) => {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      const data = edge.data as FamilyLinkData | undefined;
      if (!source || !target || !data) return [];
      const start = handlePoint(source, frame.position, edge.sourceHandle);
      const end = handlePoint(target, frame.position, edge.targetHandle);
      return [
        {
          id: edge.id,
          d: familyLinkPath({
            sourceX: start.x,
            sourceY: start.y,
            targetX: end.x,
            targetY: end.y,
            sourceHandleId: edge.sourceHandle,
            data,
          }),
          stroke: String(edge.style?.stroke ?? '#c8102e'),
          strokeWidth: Number(edge.style?.strokeWidth ?? 2),
        },
      ];
    });
    return { frame, people, lines };
  }, [family, familySlug, tree]);

  if (!poster) return null;
  const { frame, people, lines } = poster;
  const scale = Math.min(width / frame.data.width, height / frame.data.height);
  return (
    <div
      className="absolute"
      style={{
        left: (width - frame.data.width * scale) / 2,
        top: (height - frame.data.height * scale) / 2,
        width: frame.data.width,
        height: frame.data.height,
        transform: `scale(${scale})`,
        transformOrigin: '0 0',
      }}
    >
      <PosterSheet
        width={frame.data.width}
        height={frame.data.height}
        scale={frame.data.scale}
        settings={frame.data.settings}
        familyName={frame.data.familyName}
      />
      <svg
        className="absolute inset-0 overflow-visible"
        width={frame.data.width}
        height={frame.data.height}
        aria-hidden="true"
      >
        {lines.map((line) => (
          <path key={line.id} d={line.d} fill="none" stroke={line.stroke} strokeWidth={line.strokeWidth} />
        ))}
      </svg>
      {people.map((node) => (
        <div
          key={node.id}
          className="absolute"
          style={{ left: node.position.x - frame.position.x, top: node.position.y - frame.position.y }}
        >
          <PersonCard data={node.data} />
        </div>
      ))}
    </div>
  );
}
