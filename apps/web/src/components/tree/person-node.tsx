import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

import { FITTED_LINE_HEIGHT, fitTextSize } from '@/lib/fit-text';
import { cardBottomGap, VIEWER_NODE_WIDTH, type PersonFlowNode } from '@/lib/tree-layout';
import type { Gender } from '@/types/family-tree';

const FRAMES = {
  elder: { src: '/images/decorations/frame-doi-1.png', slice: 80, border: 30 },
  descendant: { src: '/images/decorations/frame-doi-2.png', slice: 90, border: 33 },
};

const SCROLL = {
  src: '/images/decorations/frame-doi-1-scroll.webp',
  height: 480,
  slice: { y: 175, x: 170 },
  paper: { top: 130, bottom: 110, x: 180 },
};

type CardFrame = {
  style: CSSProperties;
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

const NAME_COLORS: Record<Gender, { name: string; honorific: string }> = {
  MALE: { name: 'text-brand-700', honorific: 'text-brand-700/75' },
  FEMALE: { name: 'text-[#2f5f86]', honorific: 'text-[#2f5f86]/75' },
  OTHER: { name: 'text-brand-700', honorific: 'text-brand-700/75' },
  UNKNOWN: { name: 'text-brand-700', honorific: 'text-brand-700/75' },
};

const NAME_FONT_FAMILY = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const HONORIFIC_SIZE = 11;
const HONORIFIC_LINE_HEIGHT = 1.5;
/**
 * Room above and below the name, in em: stacked Vietnamese marks (Ễ, Ố) and descenders reach
 * past a 1.2 line box, and the clamped name clips whatever leaves its box.
 */
const NAME_GLYPH_ROOM = 0.12;
/** Smallest share of the fitted size the on-screen check may shrink a name to. */
const MIN_NAME_SHRINK = 0.6;
const FOUNDER_TEXT = { nameWeight: 900, name: 'font-black', honorific: 'font-extrabold' };
const DEFAULT_TEXT = { nameWeight: 700, name: 'font-bold', honorific: 'font-semibold' };

/**
 * The founder's scroll keeps its shape while its text scale follows the row width, so on a large
 * family's shrunken cards the honorific would fill the paper; it keeps to this share of it.
 */
const FOUNDER_HONORIFIC_SHARE = 0.15;
/** Largest name size, as a share of the paper height; the founder's name gets most of the scroll. */
const NAME_HEIGHT_SHARE = { founder: 0.5, default: 0.4 };

function honorificFontSize(isFounder: boolean, inner: CardFrame['inner'], textScale: number) {
  const size = HONORIFIC_SIZE * textScale;
  return isFounder ? Math.min(size, inner.height * FOUNDER_HONORIFIC_SHARE) : size;
}

function nameFontSize(
  name: string,
  inner: CardFrame['inner'],
  textScale: number,
  honorificSize: number | null,
  weight: number,
  isFounder: boolean,
): number {
  const innerWidth = inner.width * 0.9;
  const innerHeight =
    inner.height * 0.9 - (honorificSize === null ? 0 : honorificSize * HONORIFIC_LINE_HEIGHT);
  return fitTextSize({
    text: name,
    width: innerWidth,
    height: innerHeight,
    font: `${weight} ${NAME_FONT_FAMILY}`,
    minSize: 10 * textScale,
    maxSize: Math.min(
      inner.height * (isFounder ? NAME_HEIGHT_SHARE.founder : NAME_HEIGHT_SHARE.default),
      inner.width * 0.22,
    ),
    maxLines: inner.height / inner.width > 0.8 ? 4 : 3,
    fallback: 18 * textScale,
  });
}

const subscribeNever = (): (() => void) => () => {};

function useIsBrowser(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

export const HighlightedPersonContext = createContext<string | null>(null);

const hiddenHandle = '!size-1 !min-h-0 !min-w-0 !border-0 !bg-transparent';

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
  const honorificSize = data.honorific
    ? honorificFontSize(isFounder, frame.inner, data.textScale)
    : null;
  const fittedSize = nameFontSize(
    data.name,
    frame.inner,
    data.textScale,
    honorificSize,
    text.nameWeight,
    isFounder,
  );
  const baseNameSize = isBrowser ? fittedSize : 18 * data.textScale;
  const nameRef = useRef<HTMLHeadingElement>(null);
  const shrinkKey = `${data.name}|${data.honorific ?? ''}|${baseNameSize}`;
  const [shrink, setShrink] = useState({ key: '', factor: 1 });
  const shrinkFactor = shrink.key === shrinkKey ? shrink.factor : 1;
  const nameSize = baseNameSize * shrinkFactor;

  // The size above comes from a canvas estimate, which can be short of what the device renders
  // (its own fonts, a larger system text size). The rendered card is checked and the name shrunk
  // step by step until it sits inside the frame.
  useLayoutEffect(() => {
    const name = nameRef.current;
    const card = name?.parentElement;
    if (!isBrowser || !name || !card || shrinkFactor <= MIN_NAME_SHRINK) return;
    const contentHeight = Array.from(card.children).reduce(
      (total, child) => total + (child as HTMLElement).offsetHeight,
      0,
    );
    const overflows =
      contentHeight > card.clientHeight + 1 ||
      name.scrollHeight > name.clientHeight + 1 ||
      name.scrollWidth > name.clientWidth + 1;
    if (overflows) setShrink({ key: shrinkKey, factor: shrinkFactor * 0.92 });
  }, [isBrowser, shrinkFactor, shrinkKey]);

  const colors = NAME_COLORS[data.gender];
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
        className="absolute inset-0 flex flex-col items-center justify-center px-1 text-center pointer-fine:drop-shadow-[0_6px_10px_rgba(80,55,10,0.18)]"
        style={frame.style}
      >
        {data.honorific ? (
          <p
            className={`max-w-full shrink-0 truncate uppercase tracking-wider ${text.honorific} ${honorificColor}`}
            style={{
              fontSize: honorificSize ?? undefined,
              lineHeight: HONORIFIC_LINE_HEIGHT,
            }}
            title={data.honorific}
          >
            {data.honorific}
          </p>
        ) : null}
        <h2
          ref={nameRef}
          className={`line-clamp-4 max-w-full shrink-0 text-balance ${text.name} ${colors.name}`}
          style={{
            fontFamily: NAME_FONT_FAMILY,
            fontSize: nameSize,
            lineHeight: FITTED_LINE_HEIGHT,
            paddingBlock: `${NAME_GLYPH_ROOM}em`,
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
