import Image from 'next/image';
import type { NodeProps } from '@xyflow/react';

import type { PosterFrameNode, PosterTitleNode } from '@/lib/tree-layout';

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

/** Red ribbon banner: "PHẢ ĐỒ" over the family name, rolled at both ends. */
export function PosterTitle({ data }: NodeProps<PosterTitleNode>) {
  return (
    <div
      className={decorative + ' relative h-[190px] drop-shadow-[0_12px_14px_rgba(92,34,4,0.35)]'}
      style={{ width: data.width }}
    >
      <Image
        src="/images/headers/pha-do-scroll.png"
        alt=""
        fill
        sizes="1100px"
        className="object-fill"
        aria-hidden="true"
        priority
      />
      <div
        className="relative z-10 flex h-full flex-col items-center justify-center px-[23%] pb-8 text-center"
        style={{ fontFamily: SERIF }}
      >
        <p className="text-[29px] font-bold uppercase leading-none tracking-[0.26em] text-[#fff0a6] drop-shadow-[0_2px_1px_rgba(91,17,8,0.95)]">
          {data.heading}
        </p>
        <h1 className="mt-1 max-w-full truncate text-[48px] font-black uppercase leading-none text-[#ffe047] drop-shadow-[0_3px_1px_rgba(91,17,8,0.95)]">
          {data.familyName}
        </h1>
      </div>
    </div>
  );
}
