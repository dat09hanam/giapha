import type { NodeProps } from '@xyflow/react';

import { PosterSheet } from '@/components/tree/poster-art';
import type { PosterFrameNode } from '@/lib/tree-layout';

export function PosterFrame({ data }: NodeProps<PosterFrameNode>) {
  return (
    <div
      className="pointer-events-none select-none shadow-[0_30px_80px_rgba(60,20,0,0.35)]"
      aria-hidden="true"
    >
      <PosterSheet
        width={data.width}
        height={data.height}
        scale={data.scale}
        settings={data.settings}
        familyName={data.familyName}
      />
    </div>
  );
}
