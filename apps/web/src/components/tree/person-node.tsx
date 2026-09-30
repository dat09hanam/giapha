import type { CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

import type { PersonFlowNode } from '@/lib/tree-layout';

/**
 * Nine-slice frames: the corners keep their carved shape while the card stays a
 * fixed 16:9 at every screen size. Slice values are in source-image pixels.
 */
const FRAME_STYLES = {
  founder: {
    borderStyle: 'solid',
    borderWidth: 30,
    borderImage: 'url(/images/frames/frame-doi-1.png) 80 fill / 30px stretch',
  },
  descendant: {
    borderStyle: 'solid',
    borderWidth: 33,
    borderImage: 'url(/images/frames/frame-doi-2.png) 90 fill / 33px stretch',
  },
} satisfies Record<string, CSSProperties>;

const hiddenHandle = '!size-1 !min-h-0 !min-w-0 !border-0 !bg-transparent';

export function PersonNode({ data }: NodeProps<PersonFlowNode>) {
  const isFounder = data.generation === 1;

  return (
    <div className="relative aspect-video w-[288px]">
      {isFounder ? (
        // The Đời 1 crest sits on the top edge of the frame.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/images/frames/crest-doi-1.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute bottom-[calc(100%-1px)] left-1/2 w-[82%] -translate-x-1/2 select-none"
        />
      ) : null}

      <article
        className="absolute inset-0 flex flex-col items-center justify-center px-1 text-center drop-shadow-[0_6px_10px_rgba(80,55,10,0.18)]"
        style={isFounder ? FRAME_STYLES.founder : FRAME_STYLES.descendant}
      >
        {data.honorific ? (
          <p
            className="max-w-full truncate text-[11px] font-semibold uppercase tracking-wider text-amber-800"
            title={data.honorific}
          >
            {data.honorific}
          </p>
        ) : null}
        <h2
          className="line-clamp-2 max-w-full text-[17px] font-semibold leading-tight text-[#3b2a0c]"
          title={data.name}
        >
          {data.name}
        </h2>
      </article>

      <Handle id="parent-target" type="target" position={Position.Top} className={hiddenHandle} />
      <Handle id="spouse-target" type="target" position={Position.Left} className={hiddenHandle} />
      <Handle id="spouse-source" type="source" position={Position.Right} className={hiddenHandle} />
      <Handle id="child-source" type="source" position={Position.Bottom} className={hiddenHandle} />
      <Handle id="bracket-target" type="target" position={Position.Bottom} className={hiddenHandle} />
    </div>
  );
}
