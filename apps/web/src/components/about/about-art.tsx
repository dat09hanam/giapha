import Image from 'next/image';

/** Decorative SVG drawings and image artwork used on family pages. */

/** Cổng tam quan: a tall middle gate between two lower ones, with upswept eaves. */
export function TempleGate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 120" className={className} aria-hidden="true">
      <g
        fill="var(--color-brand-50)"
        stroke="var(--color-brand-700)"
        strokeWidth={2}
        strokeLinejoin="round"
      >
        {/* Side gates */}
        <rect x="22" y="70" width="52" height="40" />
        <rect x="166" y="70" width="52" height="40" />
        <path d="M10 70 Q20 66 26 58 L70 58 Q76 66 86 70 Z" />
        <path d="M154 70 Q164 66 170 58 L214 58 Q220 66 230 70 Z" />
        <path d="M40 110 V84 Q48 76 56 84 V110" fill="var(--color-paper)" />
        <path d="M184 110 V84 Q192 76 200 84 V110" fill="var(--color-paper)" />
        {/* Middle gate, two roofs */}
        <rect x="88" y="58" width="64" height="52" />
        <path d="M70 60 Q84 54 92 44 L148 44 Q156 54 170 60 Z" />
        <rect x="98" y="30" width="44" height="14" />
        <path d="M82 32 Q94 27 100 18 L140 18 Q146 27 158 32 Z" />
        <path d="M104 110 V78 Q120 62 136 78 V110" fill="var(--color-paper)" />
        {/* Ridge ornament */}
        <path d="M112 18 Q120 8 128 18" fill="none" />
        <circle cx="120" cy="10" r="3" fill="var(--color-brand-600)" />
      </g>
      {/* Pillars and the base */}
      <g stroke="var(--color-brand-700)" strokeWidth={2}>
        <path d="M92 58 V110 M148 58 V110 M26 70 V110 M70 70 V110 M170 70 V110 M214 70 V110" />
        <path d="M4 112 H236" strokeWidth={3} strokeLinecap="round" />
      </g>
      {/* Plaque */}
      <rect
        x="108"
        y="47"
        width="24"
        height="9"
        rx="1.5"
        fill="var(--color-brand-600)"
        stroke="var(--color-brand-800)"
      />
    </svg>
  );
}

/** Layered far mountains along the bottom of the cover. */
export function Mountains({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 80" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path
        d="M0 80 V52 Q40 30 80 46 T170 34 Q210 18 250 40 T330 30 Q370 24 400 40 V80 Z"
        fill="var(--color-paper-deep)"
        opacity="0.7"
      />
      <path
        d="M0 80 V64 Q60 46 120 60 T240 54 Q300 44 360 58 T400 56 V80 Z"
        fill="var(--color-brand-100)"
        opacity="0.55"
      />
    </svg>
  );
}

/** A lotus in bloom over two leaves. */
export function Lotus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden="true">
      <g fill="#a7b89a" stroke="#6f8a63" strokeWidth={1.5}>
        <path d="M8 92 Q20 70 52 78 Q36 96 8 92 Z" />
        <path d="M112 90 Q100 68 70 78 Q86 96 112 90 Z" />
      </g>
      <path d="M60 96 V70" stroke="#6f8a63" strokeWidth={2} />
      <g fill="#f6c3cc" stroke="#d9677b" strokeWidth={1.5} strokeLinejoin="round">
        <path d="M60 72 Q34 64 28 40 Q48 44 60 72 Z" />
        <path d="M60 72 Q86 64 92 40 Q72 44 60 72 Z" />
        <path d="M60 72 Q40 52 46 24 Q60 38 60 72 Z" />
        <path d="M60 72 Q80 52 74 24 Q60 38 60 72 Z" />
        <path d="M60 72 Q50 40 60 14 Q70 40 60 72 Z" fill="#fadbe0" />
      </g>
    </svg>
  );
}

/** A soft botanical lotus illustration for the family's paper scenery. */
export function LotusArtwork({ className }: { className?: string }) {
  return (
    <Image
      src="/images/decorations/lotus-bloom.webp"
      alt=""
      aria-hidden="true"
      width={512}
      height={468}
      draggable={false}
      className={className}
    />
  );
}

/** A branch of blossom reaching in from the top corner. */
export function BlossomBranch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 90" className={className} aria-hidden="true">
      <path
        d="M0 8 Q40 14 64 34 T120 70 M46 22 Q58 8 76 6 M78 46 Q96 40 104 26"
        fill="none"
        stroke="#7a5a43"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <g fill="#f6c3cc" stroke="#d9677b" strokeWidth={1}>
        {[
          [62, 32],
          [76, 6],
          [104, 26],
          [118, 68],
          [90, 52],
          [34, 16],
        ].map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r={5.5} />
            <circle cx={cx} cy={cy} r={1.6} fill="#c4432c" stroke="none" />
          </g>
        ))}
      </g>
    </svg>
  );
}
