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
      <div className="grid min-h-[560px] place-items-center p-8 text-center text-stone-600">
        <div>
          <p className="font-medium text-stone-800">Gia phả chưa có thành viên</p>
          <p className="mt-1 text-sm">Dữ liệu sẽ xuất hiện tại đây sau khi được bổ sung.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-14rem)] min-h-[560px]" aria-label="Sơ đồ cây gia phả">
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
