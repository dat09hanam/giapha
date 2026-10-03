'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { PersonDetailsDialog } from '@/components/tree/person-details-dialog';
import { PersonNode } from '@/components/tree/person-node';
import { PosterFrame } from '@/components/tree/poster-nodes';
import { toPosterElements } from '@/lib/tree-layout';
import type { FamilyPoster } from '@/lib/poster-decorations';
import type { FamilyTreeResponse } from '@/types/family-tree';

const nodeTypes = {
  person: PersonNode,
  posterFrame: PosterFrame,
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
  family: { name: string; poster: FamilyPoster };
  familySlug: string;
}) {
  const { nodes, edges } = useMemo(
    () => toPosterElements(tree, family, familySlug),
    [family, familySlug, tree],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closeDetails = useCallback(() => setSelectedId(null), []);

  // Generations as the layout numbered them, so the popup matches the cards.
  const generations = useMemo(
    () =>
      new Map(
        nodes.flatMap((node) =>
          node.type === 'person' && 'generation' in node.data
            ? [[node.id, node.data.generation as number] as const]
            : [],
        ),
      ),
    [nodes],
  );
  const selectedPerson = selectedId
    ? tree.people.find((person) => person.id === selectedId)
    : undefined;

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
          onNodeClick={(_, node) => {
            if (node.type === 'person') setSelectedId(node.id);
          }}
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
      {selectedPerson ? (
        <PersonDetailsDialog
          person={selectedPerson}
          generation={generations.get(selectedPerson.id) ?? selectedPerson.generation}
          people={tree.people}
          relationships={tree.relationships}
          familySlug={familySlug}
          onSelectPerson={setSelectedId}
          onClose={closeDetails}
        />
      ) : null}
    </div>
  );
}
