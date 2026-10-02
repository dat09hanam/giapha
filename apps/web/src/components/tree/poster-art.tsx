import { useId, type CSSProperties } from 'react';

import { backgroundTreeArea, POSTER_GEOMETRY as g, posterTreeRegion } from '@/lib/poster-geometry';
import {
  decorationImageSrc,
  type FamilyPoster,
  type PosterDecoration,
  type PosterInsets,
  type PosterNameArea,
} from '@/lib/poster-decorations';

/*
 * The phả đồ sheet drawn from the family's chosen library background. Built-in
 * backgrounds are drawn here by their `builtinKey`; uploaded ones from their
 * image. Pure drawing with no React Flow dependency, so admin screens can
 * preview the same sheet.
 */

const RED = '#c8102e';
const DARK_RED = '#8a0b1f';
const GOLD = '#ffd83a';

function svgTile(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** One square of the red-and-gold key (chữ Công) pattern. */
const KEY_TILE = svgTile(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="${RED}"/><path d="M5 35V5h30v24H13V13h14v8h-6" fill="none" stroke="${GOLD}" stroke-width="3.4" stroke-linecap="square"/></svg>`,
);

type BandStyle = { fill: CSSProperties; rules: { inset: number; width: number; color: string }[] };

/** Band fill plus thin rules; rule insets and widths are fractions of the band. */
const BORDER_STYLES: Record<string, BandStyle> = {
  'red-key': {
    fill: { backgroundImage: KEY_TILE, backgroundRepeat: 'round' },
    rules: [{ inset: 1.12, width: 0.06, color: RED }],
  },
  'gold-double': {
    fill: { background: DARK_RED },
    rules: [
      { inset: 0.22, width: 0.08, color: GOLD },
      { inset: 0.62, width: 0.04, color: GOLD },
      { inset: 1.12, width: 0.05, color: DARK_RED },
    ],
  },
  'brown-lacquer': {
    fill: {
      backgroundColor: '#5a2d0c',
      backgroundImage: 'radial-gradient(circle, rgba(255, 216, 58, 0.75) 0 12%, transparent 14%)',
      backgroundRepeat: 'round',
    },
    rules: [
      { inset: 0.9, width: 0.06, color: '#d9a636' },
      { inset: 1.12, width: 0.04, color: '#5a2d0c' },
    ],
  },
};

/** The red key, gold double or lacquer frame of a built-in sheet. */
function SheetFrame({ frameKey, band }: { frameKey: string; band: number }) {
  const style = BORDER_STYLES[frameKey];
  if (!style) return null;
  const fill: CSSProperties = { ...style.fill, backgroundSize: `${band}px ${band}px` };
  return (
    <>
      <div className="absolute inset-x-0 top-0" style={{ height: band, ...fill }} />
      <div className="absolute inset-x-0 bottom-0" style={{ height: band, ...fill }} />
      <div className="absolute inset-y-0 left-0" style={{ width: band, ...fill }} />
      <div className="absolute inset-y-0 right-0" style={{ width: band, ...fill }} />
      {style.rules.map((rule) => (
        <div
          key={rule.inset}
          className="absolute"
          style={{
            inset: band * rule.inset,
            border: `${Math.max(1, band * rule.width)}px solid ${rule.color}`,
          }}
        />
      ))}
    </>
  );
}

/** Faint concentric rings and petals behind the tree, like the printed sheet. */
function Rosette({
  cx,
  cy,
  radius,
  scale,
}: {
  cx: number;
  cy: number;
  radius: number;
  scale: number;
}) {
  const step = 46 * scale;
  const rings = Array.from({ length: Math.floor(radius / step) }, (_, index) => (index + 1) * step);
  const stroke = { fill: 'none', stroke: '#e3a92b', strokeOpacity: 0.28, strokeWidth: 2.5 * scale };
  return (
    <svg className="absolute inset-0 size-full" aria-hidden="true">
      {rings.map((ring) => (
        <circle key={ring} cx={cx} cy={cy} r={ring} {...stroke} />
      ))}
      {Array.from({ length: 16 }, (_, index) => (
        <ellipse
          key={index}
          cx={cx + radius * 0.5}
          cy={cy}
          rx={radius * 0.5}
          ry={radius * 0.12}
          transform={`rotate(${(index * 360) / 16} ${cx} ${cy})`}
          {...stroke}
        />
      ))}
    </svg>
  );
}

const PAPER = 'radial-gradient(ellipse at 50% 45%, #fffbd6 0%, #fff2a3 55%, #fde27a 100%)';

/** One faint auspicious cloud, tiled across the paper. */
const CLOUD_TILE = svgTile(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><g fill="none" stroke="#e3a92b" stroke-opacity="0.32" stroke-width="2.5" stroke-linecap="round"><path d="M14 52q0-14 14-14q6-14 22-8q12-12 28 0q16-2 16 14q10 6 2 16H22q-10 0-8-8z"/><path d="M36 54a6 6 0 1 1 6 6M62 44a7 7 0 1 0 7 7"/><path d="M70 104q0-10 10-10q5-10 16-6q9-8 20 0" /></g></svg>`,
);

/** A large faint lotus centered behind the tree. */
function Lotus({ cx, cy, size }: { cx: number; cy: number; size: number }) {
  const petal = 'M0 0C-26-30-26-72 0-100C26-72 26-30 0 0Z';
  const stroke = { fill: '#f5c64a', fillOpacity: 0.1, stroke: '#e3a92b', strokeOpacity: 0.4 };
  return (
    <svg className="absolute inset-0 size-full" aria-hidden="true">
      <g transform={`translate(${cx} ${cy}) scale(${size / 100})`} strokeWidth={(100 / size) * 2.5}>
        {[-72, -48, -24, 24, 48, 72].map((angle) => (
          <path key={angle} d={petal} transform={`rotate(${angle}) scale(0.9)`} {...stroke} />
        ))}
        <path d={petal} {...stroke} />
        <path d="M-90 8Q0 40 90 8" fill="none" stroke="#e3a92b" strokeOpacity="0.4" />
        <path d="M-60 22Q0 46 60 22" fill="none" stroke="#e3a92b" strokeOpacity="0.4" />
      </g>
    </svg>
  );
}

/** Built-in sheets: a drawn frame plus a faint paper pattern. */
const BUILTIN_SHEETS: Record<
  string,
  { frame: string | null; pattern: 'rosette' | 'cloud' | 'lotus' | null }
> = {
  'red-key': { frame: 'red-key', pattern: 'rosette' },
  'gold-double': { frame: 'gold-double', pattern: 'cloud' },
  'brown-lacquer': { frame: 'brown-lacquer', pattern: 'lotus' },
  plain: { frame: null, pattern: null },
};

function imageSheetStyle(
  src: string,
  mode: PosterDecoration['backgroundMode'],
  scale: number,
): CSSProperties {
  switch (mode) {
    case 'TILE':
      return {
        backgroundImage: `url("${src}"), ${PAPER}`,
        backgroundSize: `${240 * scale}px auto, 100% 100%`,
        backgroundRepeat: 'repeat, no-repeat',
      };
    case 'COVER':
      return {
        backgroundImage: `url("${src}"), ${PAPER}`,
        backgroundSize: 'cover, 100% 100%',
        backgroundPosition: 'center',
      };
    default:
      // Full-sheet art with its own frame: stretched so the frame meets every edge.
      return {
        backgroundImage: `url("${src}"), ${PAPER}`,
        backgroundSize: '100% 100%, 100% 100%',
        backgroundRepeat: 'no-repeat',
      };
  }
}

/**
 * The sheet itself: paper, pattern and frame. Uploaded art usually already
 * includes the frame; built-in sheets draw theirs in the border band.
 */
function SheetBackground({
  decoration,
  width,
  height,
  treeTop,
  scale,
  band,
}: {
  decoration: PosterDecoration | null;
  width: number;
  height: number;
  treeTop: number;
  scale: number;
  band: number;
}) {
  const cx = width / 2;
  const cy = treeTop + (height - treeTop) * 0.42;
  const radius = Math.min(width, height) * 0.46;
  const src = decoration ? decorationImageSrc(decoration) : null;
  const builtin =
    !src && decoration?.builtinKey ? BUILTIN_SHEETS[decoration.builtinKey] : undefined;

  let style: CSSProperties = { background: PAPER };
  if (src && decoration) {
    style = imageSheetStyle(src, decoration.backgroundMode, scale);
  } else if (builtin?.pattern === 'cloud') {
    style = {
      backgroundImage: `${CLOUD_TILE}, ${PAPER}`,
      backgroundSize: `${120 * scale}px ${120 * scale}px, 100% 100%`,
    };
  }

  return (
    <div className="absolute inset-0" style={style}>
      {builtin?.pattern === 'rosette' ? (
        <Rosette cx={cx} cy={cy} radius={radius} scale={scale} />
      ) : null}
      {builtin?.pattern === 'lotus' ? (
        <Lotus cx={cx} cy={cy + radius * 0.5} size={radius * 0.95} />
      ) : null}
      {builtin?.frame ? <SheetFrame frameKey={builtin.frame} band={band} /> : null}
    </div>
  );
}

const NAME_FONT = '"Noto Serif", "Times New Roman", Georgia, serif';
/** Height of a capital with its diacritics, as a fraction of the font size. */
const NAME_CAP_HEIGHT = 0.95;
/** Rough width of one bold serif capital, as a fraction of the font size. */
const NAME_CAPITAL_WIDTH = 0.7;

/**
 * The family name written inside the background's name area, along a gentle
 * arc when the area is curved. The name is as large as the area's height
 * allows and is squeezed to the arc's length when it would run past it.
 */
export function PosterFamilyName({
  area,
  name,
  width,
  height,
}: {
  area: PosterNameArea;
  name: string;
  width: number;
  height: number;
}) {
  const id = useId().replace(/:/g, '');
  const text = name.trim().toLocaleUpperCase('vi');
  const boxWidth = (width * (100 - area.left - area.right)) / 100;
  const boxHeight = (height * (100 - area.top - area.bottom)) / 100;
  if (!text || boxWidth <= 0 || boxHeight <= 0) return null;

  // `bend` is how far the middle of the baseline rises above its ends.
  const bend = (boxHeight * area.curve) / 100;
  const capHeight = Math.max(boxHeight - Math.abs(bend), boxHeight * 0.25) * 0.9;
  const fontSize = capHeight / NAME_CAP_HEIGHT;
  // Center the band the letters sweep through inside the area.
  const endY = boxHeight / 2 + (Math.max(0, bend) + capHeight - Math.max(0, -bend)) / 2;
  const inset = boxWidth * 0.04;
  const path = `M ${inset} ${endY} Q ${boxWidth / 2} ${endY - 2 * bend} ${boxWidth - inset} ${endY}`;
  const chord = boxWidth - 2 * inset;
  const arcLength = chord * (1 + (8 / 3) * (bend / chord) ** 2);
  const fits = [...text].length * fontSize * NAME_CAPITAL_WIDTH <= arcLength;

  return (
    <svg
      className="pointer-events-none absolute overflow-visible"
      style={{
        left: `${area.left}%`,
        top: `${area.top}%`,
        width: boxWidth,
        height: boxHeight,
      }}
      viewBox={`0 0 ${boxWidth} ${boxHeight}`}
      aria-hidden="true"
    >
      <defs>
        <path id={`${id}-arc`} d={path} />
      </defs>
      <text
        fill={area.color}
        stroke="rgba(60, 10, 0, 0.35)"
        strokeWidth={fontSize * 0.05}
        paintOrder="stroke"
        fontFamily={NAME_FONT}
        fontWeight={800}
        fontSize={fontSize}
        letterSpacing={fontSize * 0.04}
      >
        <textPath
          href={`#${id}-arc`}
          startOffset="50%"
          textAnchor="middle"
          {...(fits ? {} : { textLength: arcLength, lengthAdjust: 'spacingAndGlyphs' })}
        >
          {text}
        </textPath>
      </text>
    </svg>
  );
}

/**
 * The whole decorated sheet: the background with its frame and paper, and the
 * family name in the background's name area. The tree is drawn on top by the
 * caller, inside `posterTreeRegion`.
 */
export function PosterSheet({
  width,
  height,
  scale,
  settings,
  familyName,
}: {
  width: number;
  height: number;
  scale: number;
  settings: FamilyPoster;
  familyName: string;
}) {
  const nameArea = settings.background?.nameArea;
  const tree = posterTreeRegion(width, height, scale, backgroundTreeArea(settings));
  return (
    <div className="relative overflow-hidden" style={{ width, height }}>
      <SheetBackground
        decoration={settings.background}
        width={width}
        height={height}
        treeTop={tree.top}
        scale={scale}
        band={g.band * scale}
      />
      {nameArea ? (
        <PosterFamilyName area={nameArea} name={familyName} width={width} height={height} />
      ) : null}
    </div>
  );
}

/** A dashed outline of an area marked on a background. */
export function PosterSafeAreaOutline({
  insets,
  label,
  className = 'border-emerald-700 bg-emerald-600/10 text-emerald-900',
}: {
  insets: PosterInsets;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute grid place-items-center border-2 border-dashed text-[10px] font-semibold ${className}`}
      style={{
        left: `${insets.left}%`,
        right: `${insets.right}%`,
        top: `${insets.top}%`,
        bottom: `${insets.bottom}%`,
      }}
      aria-hidden="true"
    >
      {label}
    </div>
  );
}

/** A small sample of a sheet (background and frame), for the pickers. */
export function PosterBackgroundSwatch({
  decoration,
  width,
  height,
}: {
  decoration: PosterDecoration;
  width: number;
  height: number;
}) {
  return (
    <div className="relative overflow-hidden" style={{ width, height }}>
      <SheetBackground
        decoration={decoration}
        width={width}
        height={height}
        treeTop={0}
        scale={0.3}
        band={Math.round(height * 0.12)}
      />
    </div>
  );
}
