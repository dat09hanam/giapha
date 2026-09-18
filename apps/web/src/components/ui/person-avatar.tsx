import type { Gender } from '@/types/family-tree';

/**
 * Flat bust illustration used wherever a person has no photo yet. The figure
 * fills its square so it can be clipped to a circle, and hair shape plus
 * clothing colour carry the gender without relying on colour alone.
 */

const SKIN = '#f7d2af';
const SKIN_SHADE = '#eabf98';

/** Shoulders, drawn wide enough to reach both edges of the frame. */
const BODY =
  'M32 41c-12 0-22.5 6-26 15.5A24 24 0 0 0 4.5 64h55a24 24 0 0 0-1.5-7.5C54.5 47 44 41 32 41Z';
const NECK = 'M27 32h10v9a5 5 0 0 1-10 0Z';

type Palette = {
  background: string;
  garment: string;
  collar: string;
  hair: string;
};

const PALETTES: Record<'male' | 'female' | 'neutral', Palette> = {
  male: { background: '#e3f0fb', garment: '#2b4162', collar: '#f5f8fc', hair: '#2c313c' },
  female: { background: '#fce7ea', garment: '#dfa0a4', collar: '#fbfbfb', hair: '#4a342a' },
  neutral: { background: '#eeeef2', garment: '#6b7280', collar: '#f5f5f5', hair: '#8a8f98' },
};

/** Short crop with a straight hairline. */
const MALE_HAIR =
  'M32 9c-7 0-11.5 5-11.5 12.5 0 1.9.2 3.6.5 5 .5-4 1.8-6 4-7 2.6-1.2 4.9-.4 7-.4 3.5 0 7-.4 9.2 1.7.9.9 1.2 3 1.3 5.7.3-1.4.5-3.1.5-5C43 14 38.5 9 32 9Z';
/** Shoulder-length hair that falls in front of the blazer. */
const FEMALE_HAIR =
  'M32 8c-10.5 0-15 7.5-15 18 0 7 1 14 2.5 19 1 2 5 2 6 0-2-5-3-13-3-19 0-7 3.5-10.5 9.5-10.5S41.5 19 41.5 26c0 6-1 14-3 19 1 2 5 2 6 0 1.5-5 2.5-12 2.5-19C47 15.5 42.5 8 32 8Z';
const FEMALE_FRINGE =
  'M22.5 25c.5-7 4.5-11 9.5-11s9 4 9.5 11c-1.5-5-4.5-6.5-9.5-6.5s-8 1.5-9.5 6.5Z';
/** Plain rounded cap, deliberately not gendered. */
const NEUTRAL_HAIR =
  'M32 9c-7 0-11 5-11 12.5V26c.5-6 4-8.5 11-8.5s10.5 2.5 11 8.5v-4.5C43 14 39 9 32 9Z';

function paletteFor(gender: Gender): 'male' | 'female' | 'neutral' {
  if (gender === 'MALE') return 'male';
  if (gender === 'FEMALE') return 'female';
  return 'neutral';
}

export function PersonAvatar({ gender, className }: { gender: Gender; className?: string }) {
  const variant = paletteFor(gender);
  const palette = PALETTES[variant];

  return (
    <svg viewBox="0 0 64 64" className={className} role="presentation" aria-hidden="true">
      <rect width="64" height="64" fill={palette.background} />

      <path d={BODY} fill={palette.garment} />
      <path d="M26 41.7 32 57l6-15.3c-1.8-.5-3.8-.7-6-.7s-4.2.2-6 .7Z" fill={palette.collar} />
      {variant === 'male' ? (
        <>
          <path d="M30 44.5h4L32.8 47h-1.6Z" fill="#3b82c4" />
          <path d="M32 47.5 29.9 50.5 31.1 60h1.8l1.2-9.5Z" fill="#3b82c4" />
        </>
      ) : null}

      <path d={NECK} fill={SKIN_SHADE} />
      <circle cx="21.6" cy="25" r="2.1" fill={SKIN} />
      <circle cx="42.4" cy="25" r="2.1" fill={SKIN} />
      <ellipse cx="32" cy="24" rx="10.5" ry="12.5" fill={SKIN} />

      {variant === 'male' ? <path d={MALE_HAIR} fill={palette.hair} /> : null}
      {variant === 'female' ? (
        <>
          <path d={FEMALE_HAIR} fill={palette.hair} />
          <path d={FEMALE_FRINGE} fill={palette.hair} />
        </>
      ) : null}
      {variant === 'neutral' ? <path d={NEUTRAL_HAIR} fill={palette.hair} /> : null}
    </svg>
  );
}
