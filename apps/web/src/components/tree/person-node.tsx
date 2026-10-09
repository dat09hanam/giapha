import {
  createContext,
  useContext,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

import { FITTED_LINE_HEIGHT, fitTextSize } from '@/lib/fit-text';
import { cardBottomGap, VIEWER_NODE_WIDTH, type PersonFlowNode } from '@/lib/tree-layout';
import type { Gender } from '@/types/family-tree';

/**
 * Nine-slice frames: the corners keep their carved shape while the card stays a
 * fixed 16:9 at every screen size. Slice values are in source-image pixels;
 * border widths are for a full-size card and scale with it.
 */
const FRAMES = {
  /** Đời 2 and 3. */
  elder: { src: '/images/decorations/frame-doi-1.png', slice: 80, border: 30 },
  descendant: { src: '/images/decorations/frame-doi-2.png', slice: 90, border: 33 },
};

/**
 * The Đời 1 scroll, measured in its 1800 × 480 source pixels. It scales with
 * the card's height so the dragon rollers never stretch; founder cards use its
 * wide ratio (`FOUNDER_CARD_RATIO`) and only the paper and bands stretch sideways.
 */
const SCROLL = {
  src: '/images/decorations/frame-doi-1-scroll.webp',
  height: 480,
  slice: { y: 175, x: 170 },
  /** Where the paper starts, so the name stays clear of the bands and rollers. */
  paper: { top: 130, bottom: 110, x: 180 },
};

type CardFrame = {
  style: CSSProperties;
  /** The text box inside the frame. */
  inner: { width: number; height: number };
};

function cardFrame(
  data: Pick<PersonFlowNode['data'], 'generation' | 'width' | 'height'>,
): CardFrame {
  if (data.generation === 1) {
    const scale = data.height / SCROLL.height;
    const px = (sourcePixels: number): number => sourcePixels * scale;
    return {
      style: {
        borderStyle: 'solid',
        borderWidth: `${px(SCROLL.paper.top)}px ${px(SCROLL.paper.x)}px ${px(SCROLL.paper.bottom)}px`,
        borderImage: `url(${SCROLL.src}) ${SCROLL.slice.y} ${SCROLL.slice.x} fill / ${px(SCROLL.slice.y)}px ${px(SCROLL.slice.x)}px stretch`,
      },
      inner: {
        width: data.width - 2 * px(SCROLL.paper.x),
        height: data.height - px(SCROLL.paper.top) - px(SCROLL.paper.bottom),
      },
    };
  }

  const frame = data.generation <= 3 ? FRAMES.elder : FRAMES.descendant;
  const border = Math.round((frame.border * data.width) / VIEWER_NODE_WIDTH);
  return {
    style: {
      borderStyle: 'solid',
      borderWidth: border,
      borderImage: `url(${frame.src}) ${frame.slice} fill / ${border}px stretch`,
    },
    inner: { width: data.width - 2 * border, height: data.height - 2 * border },
  };
}

/**
 * Women's names are set in a muted blue so men and women read apart at a glance;
 * everyone else keeps the brand red-brown.
 */
const NAME_COLORS: Record<Gender, { name: string; honorific: string }> = {
  MALE: { name: 'text-brand-700', honorific: 'text-brand-700/75' },
  FEMALE: { name: 'text-[#2f5f86]', honorific: 'text-[#2f5f86]/75' },
  OTHER: { name: 'text-brand-700', honorific: 'text-brand-700/75' },
  UNKNOWN: { name: 'text-brand-700', honorific: 'text-brand-700/75' },
};

const NAME_FONT_FAMILY = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const HONORIFIC_SIZE = 11;
/** Đời 1 lettering is heavier so it holds its own against the scroll's bold reds and golds. */
const FOUNDER_TEXT = { nameWeight: 900, name: 'font-black', honorific: 'font-extrabold' };
const DEFAULT_TEXT = { nameWeight: 700, name: 'font-bold', honorific: 'font-semibold' };

/**
 * The name's font size: as large as fits the space inside the frame, so short
 * names read big and long ones wrap instead of overflowing. Taller cards allow
 * one more line.
 */
function nameFontSize(
  name: string,
  inner: CardFrame['inner'],
  textScale: number,
  hasHonorific: boolean,
  weight: number,
): number {
  const innerWidth = inner.width * 0.9;
  const innerHeight =
    inner.height * 0.9 - (hasHonorific ? HONORIFIC_SIZE * textScale * FITTED_LINE_HEIGHT : 0);
  return fitTextSize({
    text: name,
    width: innerWidth,
    height: innerHeight,
    font: `${weight} ${NAME_FONT_FAMILY}`,
    minSize: 10 * textScale,
    // One line should not fill more than about 40% of the frame's inside, nor
    // grow past what suits the card's width on squarer cards.
    maxSize: Math.min(inner.height * 0.4, inner.width * 0.22),
    maxLines: inner.height / inner.width > 0.8 ? 4 : 3,
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

/**
 * The framed card itself, with no React Flow handles, so the printed poster can draw the same
 * card. `children` go inside the card box; the canvas puts its handles there.
 */
export function PersonCard({
  data,
  highlighted = false,
  children,
}: {
  data: PersonFlowNode['data'];
  highlighted?: boolean;
  children?: ReactNode;
}) {
  const hasCrest = data.generation === 2 || data.generation === 3;
  const frame = cardFrame(data);
  const isBrowser = useIsBrowser();
  const isFounder = data.generation === 1;
  const text = isFounder ? FOUNDER_TEXT : DEFAULT_TEXT;
  const fittedSize = nameFontSize(
    data.name,
    frame.inner,
    data.textScale,
    Boolean(data.honorific),
    text.nameWeight,
  );
  const nameSize = isBrowser ? fittedSize : 18 * data.textScale;
  const colors = NAME_COLORS[data.gender];
  // Đời 1's honorific is solid rather than faded.
  const honorificColor = isFounder ? colors.name : colors.honorific;

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
      {hasCrest ? (
        // Đời 2 and 3 wear the crest on the top edge of their frame; it fits in the row gap above.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/images/decorations/crest-doi-1.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute bottom-[calc(100%-1px)] left-1/2 w-[82%] -translate-x-1/2 select-none"
        />
      ) : null}

      <article
        className="absolute inset-0 flex flex-col items-center justify-center px-1 text-center drop-shadow-[0_6px_10px_rgba(80,55,10,0.18)]"
        style={frame.style}
      >
        {data.honorific ? (
          <p
            className={`max-w-full truncate uppercase tracking-wider ${text.honorific} ${honorificColor}`}
            style={{ fontSize: HONORIFIC_SIZE * data.textScale }}
            title={data.honorific}
          >
            {data.honorific}
          </p>
        ) : null}
        <h2
          className={`line-clamp-4 max-w-full text-balance ${text.name} ${colors.name}`}
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

      {children}
    </div>
  );
}

export function PersonNode({ id, data }: NodeProps<PersonFlowNode>) {
  const highlighted = useContext(HighlightedPersonContext) === id;
  // Lines leave from the frame's lower band, not the scroll's roller caps below it.
  const bottomHandleStyle = { bottom: cardBottomGap(data) };
  return (
    <PersonCard data={data} highlighted={highlighted}>
      <Handle id="parent-target" type="target" position={Position.Top} className={hiddenHandle} />
      <Handle id="spouse-target" type="target" position={Position.Left} className={hiddenHandle} />
      <Handle id="spouse-source" type="source" position={Position.Right} className={hiddenHandle} />
      <Handle
        id="child-source"
        type="source"
        position={Position.Bottom}
        className={hiddenHandle}
        style={bottomHandleStyle}
      />
      <Handle
        id="bracket-target"
        type="target"
        position={Position.Bottom}
        className={hiddenHandle}
        style={bottomHandleStyle}
      />
    </PersonCard>
  );
}
