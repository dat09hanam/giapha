import { Playfair_Display, Water_Brush } from 'next/font/google';
import { useEffect, useId, useLayoutEffect, useState, type CSSProperties } from 'react';

import {
  decorationImageSrc,
  type FamilyPoster,
  type PosterDecoration,
  type PosterInsets,
  type PosterNameArea,
  type PosterVerticalTextArea,
} from '@/lib/poster-decorations';

/*
 * The phả đồ sheet drawn from the family's chosen library background, an
 * uploaded image. Pure drawing with no React Flow dependency, so admin screens
 * can preview the same sheet.
 */

const PAPER = 'radial-gradient(ellipse at 50% 45%, #fffbd6 0%, #fff2a3 55%, #fde27a 100%)';

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

/** The sheet itself: the uploaded art over plain paper, or plain paper alone. */
function SheetBackground({
  decoration,
  scale,
}: {
  decoration: PosterDecoration | null;
  scale: number;
}) {
  const src = decoration ? decorationImageSrc(decoration) : null;
  const style: CSSProperties =
    src && decoration
      ? imageSheetStyle(src, decoration.backgroundMode, scale)
      : { background: PAPER };
  return <div className="absolute inset-0" style={style} />;
}

/** Bold classical serif for the family name on the banner. */
const nameFont = Playfair_Display({ weight: '900', subsets: ['vietnamese'], display: 'swap' });
const NAME_FONT = `${nameFont.style.fontFamily}, "Times New Roman", Georgia, serif`;
const NAME_FONT_WEIGHT = 900;
/** Brush script with Vietnamese marks, in the style of an ông đồ's thư pháp. */
const calligraphyFont = Water_Brush({ weight: '400', subsets: ['vietnamese'], display: 'swap' });
const VERTICAL_TEXT_FONT = `${calligraphyFont.style.fontFamily}, "Segoe Script", cursive`;
/** Share of a vertical text area's width its widest word may take. */
const VERTICAL_TEXT_FILL = 0.9;
const MEASURE_SIZE = 100;
let measureContext: CanvasRenderingContext2D | null | undefined;

/** Width of the widest of `words` in `font` (weight and family), in ems; 0 when it can't be measured. */
function widestWordEm(words: string[], font: string): number {
  if (measureContext === undefined) {
    measureContext = document.createElement('canvas').getContext('2d');
  }
  if (!measureContext) return 0;
  const [weight, ...family] = font.split(' ');
  measureContext.font = `${weight} ${MEASURE_SIZE}px ${family.join(' ')}`;
  const widest = Math.max(0, ...words.map((word) => measureContext!.measureText(word).width));
  return widest / MEASURE_SIZE;
}

/** Height of a capital with its diacritics, as a fraction of the font size. */
const NAME_CAP_HEIGHT = 0.95;
/** Rough width of one heavy serif capital, as a fraction of the font size, until measured. */
const NAME_CAPITAL_WIDTH = 0.78;

/** Becomes true once the page's web fonts have loaded, so text can be measured in them. */
function useFontsReady(): boolean {
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return fontsReady;
}

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
  const fontsReady = useFontsReady();
  const measureKey = `${text}|${fontsReady}`;
  const [measured, setMeasured] = useState({ key: '', em: 0 });

  // The letter-count estimate is replaced by the name's real width in the font
  // once measured, so it is only squeezed when it truly would not fit.
  useLayoutEffect(() => {
    const em = widestWordEm([text], `${NAME_FONT_WEIGHT} ${NAME_FONT}`);
    if (em > 0) setMeasured({ key: measureKey, em });
    // `measureKey` already covers the text.
  }, [measureKey]);

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
  const textEm = measured.key === measureKey ? measured.em : [...text].length * NAME_CAPITAL_WIDTH;
  // Letter spacing adds to the drawn width too.
  const fits = (textEm + [...text].length * 0.04) * fontSize <= arcLength;

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
        fontWeight={NAME_FONT_WEIGHT}
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

/** Family-specific text laid out one horizontal word per row, from top to bottom. */
export function PosterVerticalText({
  area,
  text: rawText,
  width,
  height,
}: {
  area: PosterVerticalTextArea;
  text: string;
  width: number;
  height: number;
}) {
  const words = rawText
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    // Calligraphy capitalises each word rather than writing in all caps.
    .map((word) => {
      const [first = '', ...rest] = [...word.toLocaleLowerCase('vi')];
      return first.toLocaleUpperCase('vi') + rest.join('');
    });
  const boxWidth = (width * (100 - area.left - area.right)) / 100;
  const boxHeight = (height * (100 - area.top - area.bottom)) / 100;

  // Script glyph widths vary too much to size from the letter count alone, so
  // the letter-count estimate is only a starting point: in the browser the
  // widest word is measured in ems off-screen and the font sized from that.
  // Measuring off-screen keeps the result independent of the rendered size, so
  // resizing the area never feeds back into another measurement.
  const fontsReady = useFontsReady();
  const measureKey = `${words.join(' ')}|${fontsReady}`;
  const [measured, setMeasured] = useState({ key: '', widestEm: 0 });

  useLayoutEffect(() => {
    const widestEm = widestWordEm(words, `400 ${VERTICAL_TEXT_FONT}`);
    if (widestEm > 0) setMeasured({ key: measureKey, widestEm });
    // `measureKey` already covers the words.
  }, [measureKey]);

  if (words.length === 0 || boxWidth <= 0 || boxHeight <= 0) return null;

  const longestWordLength = Math.max(...words.map((word) => [...word].length));
  const widestEm =
    measured.key === measureKey ? measured.widestEm : Math.max(1, longestWordLength * 0.8);
  // Size against both the widest word and the number of rows, then distribute
  // the rows over the full height so the inscription fills the marked area.
  const widthSize = (boxWidth * VERTICAL_TEXT_FILL) / widestEm;
  const heightSize = boxHeight / (words.length * 1.08);
  const fontSize = Math.min(widthSize, heightSize);

  return (
    <div
      className="pointer-events-none absolute flex flex-col items-center overflow-hidden text-center"
      style={{
        left: `${area.left}%`,
        top: `${area.top}%`,
        width: boxWidth,
        height: boxHeight,
        color: area.color,
        fontFamily: VERTICAL_TEXT_FONT,
        fontSize,
        fontWeight: 400,
        justifyContent: words.length === 1 ? 'center' : 'space-between',
        lineHeight: 1,
        paddingBlock: fontSize * 0.04,
        textShadow: `0 0 ${Math.max(1, fontSize * 0.045)}px rgba(60, 10, 0, 0.65)`,
      }}
      aria-hidden="true"
    >
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="block w-max whitespace-nowrap">
          {word}
        </span>
      ))}
    </div>
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
  const leftTextArea = settings.background?.leftTextArea;
  const rightTextArea = settings.background?.rightTextArea;
  return (
    <div className="relative overflow-hidden" style={{ width, height }}>
      <SheetBackground decoration={settings.background} scale={scale} />
      {nameArea ? (
        <PosterFamilyName area={nameArea} name={familyName} width={width} height={height} />
      ) : null}
      {leftTextArea && settings.leftText ? (
        <PosterVerticalText
          area={leftTextArea}
          text={settings.leftText}
          width={width}
          height={height}
        />
      ) : null}
      {rightTextArea && settings.rightText ? (
        <PosterVerticalText
          area={rightTextArea}
          text={settings.rightText}
          width={width}
          height={height}
        />
      ) : null}
    </div>
  );
}

/** A dashed outline of an area marked on a background. */
export function PosterSafeAreaOutline({
  insets,
  label,
  className = 'border-brand-700 bg-brand-600/10 text-brand-900',
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
      <SheetBackground decoration={decoration} scale={0.3} />
    </div>
  );
}
