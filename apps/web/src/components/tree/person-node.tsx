import { createContext, useContext, useSyncExternalStore, type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

import { FITTED_LINE_HEIGHT, fitTextSize } from '@/lib/fit-text';
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

const NAME_FONT_FAMILY = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const HONORIFIC_SIZE = 11;

/**
 * The name's font size: as large as fits the space inside the frame, so short
 * names read big and long ones wrap instead of overflowing. Taller cards allow
 * one more line.
 */
function nameFontSize(
  name: string,
  width: number,
  height: number,
  border: number,
  textScale: number,
  hasHonorific: boolean,
): number {
  const innerWidth = (width - 2 * border) * 0.9;
  const innerHeight =
    (height - 2 * border) * 0.9 -
    (hasHonorific ? HONORIFIC_SIZE * textScale * FITTED_LINE_HEIGHT : 0);
  return fitTextSize({
    text: name,
    width: innerWidth,
    height: innerHeight,
    font: `700 ${NAME_FONT_FAMILY}`,
    minSize: 10 * textScale,
    // One line should not fill more than about 40% of the frame's inside, nor
    // grow past what suits the card's width on squarer cards.
    maxSize: Math.min((height - 2 * border) * 0.4, (width - 2 * border) * 0.22),
    maxLines: height / width > 0.8 ? 4 : 3,
    fallback: 18 * textScale,
  });
}

const subscribeNever = (): (() => void) => () => {};

/**
 * False while rendering on the server and during hydration, true afterwards.
 * Text can only be measured in the browser, and the server's estimate must be
 * replaced rather than kept by hydration, which leaves mismatched styles as-is.
 */
function useIsBrowser(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

/**
 * The person the viewer searched for. Kept out of node data so highlighting
 * does not hand React Flow new nodes, which would re-measure and re-fit them.
 */
export const HighlightedPersonContext = createContext<string | null>(null);

const hiddenHandle = '!size-1 !min-h-0 !min-w-0 !border-0 !bg-transparent';

export function PersonNode({ id, data }: NodeProps<PersonFlowNode>) {
  const highlighted = useContext(HighlightedPersonContext) === id;
  const isFounder = data.generation === 1;
  const frame = isFounder ? FRAMES.founder : FRAMES.descendant;
  const border = Math.round((frame.border * data.width) / VIEWER_NODE_WIDTH);
  const isBrowser = useIsBrowser();
  const fittedSize = nameFontSize(
    data.name,
    data.width,
    data.height,
    border,
    data.textScale,
    Boolean(data.honorific),
  );
  const nameSize = isBrowser ? fittedSize : 18 * data.textScale;

  return (
    <div
      className="relative cursor-pointer transition hover:-translate-y-0.5 hover:brightness-105"
      style={{ width: data.width, height: data.height }}
      title="Xem thông tin"
    >
      {highlighted ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-3 animate-pulse rounded-2xl border-4 border-amber-400 bg-amber-300/25 shadow-[0_0_32px_8px_rgba(251,191,36,0.75)]"
        />
      ) : null}
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
            className="max-w-full truncate font-semibold uppercase tracking-wider text-[#8b1a1a]/75"
            style={{ fontSize: HONORIFIC_SIZE * data.textScale }}
            title={data.honorific}
          >
            {data.honorific}
          </p>
        ) : null}
        <h2
          className="line-clamp-4 max-w-full text-balance font-bold text-[#8b1a1a]"
          style={{
            fontFamily: NAME_FONT_FAMILY,
            fontSize: nameSize,
            lineHeight: FITTED_LINE_HEIGHT,
          }}
          title={data.name}
        >
          {data.name}
        </h2>
      </article>

      <Handle id="parent-target" type="target" position={Position.Top} className={hiddenHandle} />
      <Handle id="spouse-target" type="target" position={Position.Left} className={hiddenHandle} />
      <Handle id="spouse-source" type="source" position={Position.Right} className={hiddenHandle} />
      <Handle id="child-source" type="source" position={Position.Bottom} className={hiddenHandle} />
      <Handle
        id="bracket-target"
        type="target"
        position={Position.Bottom}
        className={hiddenHandle}
      />
    </div>
  );
}
