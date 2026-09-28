'use client';

import { useEffect, useMemo } from 'react';
import {
  Controls,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
  useStore,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { familyEdgeTypes } from '@/components/tree/family-link-edge';
import { PersonNode } from '@/components/tree/person-node';
import { Couplet, GenerationLabel, PosterFrame, PosterTitle } from '@/components/tree/poster-nodes';
import { toPosterElements } from '@/lib/tree-layout';
import type { FamilySummary, FamilyTreeResponse } from '@/types/family-tree';

const nodeTypes = {
  person: PersonNode,
  posterFrame: PosterFrame,
  posterTitle: PosterTitle,
  generationLabel: GenerationLabel,
  couplet: Couplet,
} satisfies NodeTypes;

const FIT_VIEW_OPTIONS = { padding: 0.01 };

/**
 * Keeps the whole poster in view: re-fits once the nodes are measured and
 * whenever the 16:9 canvas changes size (first layout, resize, rotation).
 */
function FitPosterToCanvas() {
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);

  useEffect(() => {
    if (nodesInitialized && width > 0 && height > 0) void fitView(FIT_VIEW_OPTIONS);
  }, [fitView, height, nodesInitialized, width]);

  return null;
}

export function FamilyTree({
  tree,
  family,
  familySlug,
}: {
  tree: FamilyTreeResponse;
  family: Pick<FamilySummary, 'name' | 'ancestryOrigin' | 'address'>;
  familySlug: string;
}) {
  const { nodes, edges } = useMemo(
    () => toPosterElements(tree, family, familySlug),
    [family, familySlug, tree],
  );

  if (nodes.length === 0) {
    return (
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center p-8 text-center">
        <p className="text-lg font-medium text-stone-700">Cây gia phả đang được thiết kế</p>
      </div>
    );
  }

  return (
    <div className="box-border grid min-h-[calc(100vh-4rem)] place-items-center bg-stone-900 p-2 sm:p-4">
      {/* The poster is always a 16:9 landscape sheet, on phones too; zoom in to read. */}
      <div
        className="aspect-video overflow-hidden rounded-lg shadow-2xl"
        style={{ width: 'min(100%, calc((100vh - 4rem - 2rem) * 16 / 9))' }}
        aria-label="Phả đồ cây gia phả"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={familyEdgeTypes}
          fitView
          fitViewOptions={FIT_VIEW_OPTIONS}
          minZoom={0.02}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: false }}
          style={{ background: '#2a1d0e' }}
        >
          <FitPosterToCanvas />
          <Controls position="top-right" orientation="horizontal" showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
