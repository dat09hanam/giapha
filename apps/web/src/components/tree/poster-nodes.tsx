import type { NodeProps } from '@xyflow/react';

import type {
  CoupletNode,
  GenerationLabelNode,
  PosterFrameNode,
  PosterTitleNode,
} from '@/lib/tree-layout';

const SERIF = '"Noto Serif", "Times New Roman", Georgia, serif';

/** Keeps poster decoration from stealing pans or clicks meant for the tree. */
const decorative = 'pointer-events-none select-none';

function CornerOrnament({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 120" className={'absolute size-[120px] ' + className} aria-hidden="true">
      <path
        d="M8 8h104v14H22v90H8z"
        fill="#8b1a1a"
        stroke="#e2b33c"
        strokeWidth="3"
      />
      <path d="M34 34h52v10H44v42H34z" fill="none" stroke="#b8321e" strokeWidth="4" />
      <rect x="52" y="52" width="16" height="16" transform="rotate(45 60 60)" fill="#e2b33c" />
    </svg>
  );
}

/** The sheet itself: parchment yellow, red outer border and gold inner rules. */
export function PosterFrame({ data }: NodeProps<PosterFrameNode>) {
  return (
    <div
      className={decorative + ' relative'}
      style={{
        width: data.width,
        height: data.height,
        background:
          'radial-gradient(circle at 50% 45%, #fffbe3 0%, #fcf0b4 48%, #f5dc7c 100%)',
        border: '22px solid #8b1a1a',
        boxShadow:
          'inset 0 0 0 6px #e2b33c, inset 0 0 0 12px #8b1a1a, inset 0 0 0 16px #f3cf5a, 0 30px 80px rgba(60, 20, 0, 0.35)',
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-[34px]"
        style={{
          border: '4px double #b8321e',
          backgroundImage:
            'radial-gradient(circle at 20px 20px, rgba(184, 50, 30, 0.07) 0 12px, transparent 13px)',
          backgroundSize: '80px 80px',
        }}
      />
      <CornerOrnament className="left-[26px] top-[26px]" />
      <CornerOrnament className="right-[26px] top-[26px] rotate-90" />
      <CornerOrnament className="bottom-[26px] right-[26px] rotate-180" />
      <CornerOrnament className="bottom-[26px] left-[26px] -rotate-90" />
    </div>
  );
}

function ScrollRoll({ side }: { side: 'left' | 'right' }) {
  return (
    <span
      className={
        'absolute top-1/2 h-[118%] w-14 -translate-y-1/2 rounded-full ' +
        (side === 'left' ? '-left-9' : '-right-9')
      }
      style={{
        background:
          'linear-gradient(90deg, #7a4b06 0%, #f7d774 30%, #fff3b0 50%, #d9a526 72%, #6b3f05 100%)',
        boxShadow: '0 6px 14px rgba(80, 30, 0, 0.35)',
      }}
      aria-hidden="true"
    />
  );
}

/** Red ribbon banner: "PHẢ ĐỒ" over the family name, rolled at both ends. */
export function PosterTitle({ data }: NodeProps<PosterTitleNode>) {
  return (
    <div className={decorative + ' relative h-[190px]'} style={{ width: data.width }}>
      <ScrollRoll side="left" />
      <ScrollRoll side="right" />
      <div
        className="relative flex h-full flex-col items-center justify-center rounded-[28px] px-16 text-center"
        style={{
          background: 'linear-gradient(180deg, #c62828 0%, #9b1c1c 55%, #7a1414 100%)',
          border: '6px solid #f3c843',
          boxShadow: 'inset 0 0 0 3px #7a1414, inset 0 0 0 7px #f7dd7a',
          fontFamily: SERIF,
        }}
      >
        <p className="text-[34px] font-bold uppercase tracking-[0.3em] text-[#fde68a]">
          {data.heading}
        </p>
        <h1 className="mt-1 max-w-full truncate text-[58px] font-bold uppercase leading-tight text-[#fde047] drop-shadow-[0_3px_0_rgba(90,10,10,0.8)]">
          {data.familyName}
        </h1>
        {data.subtitle ? (
          <p className="mt-1 max-w-full truncate text-[18px] font-medium uppercase tracking-wider text-[#fef3c7]">
            {data.subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** "ĐỜI N" beside each row, like the margin notes of a printed phả đồ. */
export function GenerationLabel({ data }: NodeProps<GenerationLabelNode>) {
  return (
    <div
      className={decorative + ' flex h-[56px] w-[320px] items-center justify-end'}
      style={{ fontFamily: SERIF }}
    >
      <span className="border-b-2 border-dashed border-[#b8321e]/70 pb-1 text-[30px] font-bold uppercase tracking-wide text-[#b8321e]">
        {data.label}
      </span>
    </div>
  );
}

/** One line of the couplet, read top to bottom. */
export function Couplet({ data }: NodeProps<CoupletNode>) {
  return (
    <div
      className={decorative + ' flex w-[96px] flex-col items-center justify-around rounded-md px-2 py-6'}
      style={{
        height: data.height,
        background: 'linear-gradient(90deg, #fff4c9, #fffbe8 50%, #fff4c9)',
        border: '3px solid #b8321e',
        boxShadow: 'inset 0 0 0 5px #fffbe8, inset 0 0 0 7px #e2b33c',
        fontFamily: SERIF,
      }}
    >
      {data.words.map((word, index) => (
        <span
          key={index}
          className="text-[38px] font-semibold capitalize italic leading-none text-[#3b1d06]"
        >
          {word}
        </span>
      ))}
    </div>
  );
}
