'use client';

import { useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { PersonNode } from '@/components/tree/person-node';
import { toFlowElements } from '@/lib/tree-layout';
import type { FamilyTreeResponse } from '@/types/family-tree';

const nodeTypes = { person: PersonNode } satisfies NodeTypes;

export function FamilyTree({ tree }: { tree: FamilyTreeResponse }) {
  const { nodes, edges } = useMemo(() => toFlowElements(tree), [tree]);

  if (nodes.length === 0) {
    return (
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center p-8 text-center">
        <p className="text-lg font-medium text-stone-700">Cây gia phả đang được thiết kế</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] min-h-[560px]" aria-label="Sơ đồ cây gia phả">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        minZoom={0.2}
        maxZoom={1.8}
        nodesConnectable={false}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#bac8bf" />
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeColor="#d2e3d7"
          maskColor="rgb(247 245 239 / 72%)"
        />
      </ReactFlow>
    </div>
  );
}
