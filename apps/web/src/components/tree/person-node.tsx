import type { CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

import { VIEWER_NODE_WIDTH, type PersonFlowNode } from '@/lib/tree-layout';

/**
 * Nine-slice frames: the corners keep their carved shape while the card stays a
 * fixed 16:9 at every screen size. Slice values are in source-image pixels;
 * border widths are for a full-size card and scale with it.
 */
const FRAMES = {
  founder: { src: '/images/frames/frame-doi-1.png', slice: 80, border: 30 },
  descendant: { src: '/images/frames/frame-doi-2.png', slice: 90, border: 33 },
};

function frameStyle(frame: (typeof FRAMES)[keyof typeof FRAMES], border: number): CSSProperties {
  return {
    borderStyle: 'solid',
    borderWidth: border,
    borderImage: `url(${frame.src}) ${frame.slice} fill / ${border}px stretch`,
  };
}

const hiddenHandle = '!size-1 !min-h-0 !min-w-0 !border-0 !bg-transparent';

export function PersonNode({ data }: NodeProps<PersonFlowNode>) {
  const isFounder = data.generation === 1;
  const frame = isFounder ? FRAMES.founder : FRAMES.descendant;
  const border = Math.round((frame.border * data.width) / VIEWER_NODE_WIDTH);

  return (
    <div className="relative" style={{ width: data.width, height: data.height }}>
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
        style={frameStyle(frame, border)}
      >
        {data.honorific ? (
          <p
            className="max-w-full truncate font-semibold uppercase tracking-wider text-amber-800"
            style={{ fontSize: 11 * data.textScale }}
            title={data.honorific}
          >
            {data.honorific}
          </p>
        ) : null}
        <h2
          className="line-clamp-2 max-w-full font-bold leading-tight text-[#3b2a0c]"
          style={{ fontSize: 18 * data.textScale }}
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
