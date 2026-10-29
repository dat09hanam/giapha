/**
 * Effects for the poster's text areas (family name, left and right inscriptions). The area's own
 * `color` stays the solid fill; the style adds a gradient mode, an outline and a shadow. Sizes are
 * percent of the font size so the preview, the tree page and the printed sheet look the same.
 */

export type PosterTextMode = 'solid' | 'gradient';

export type PosterTextStyle = {
  mode: PosterTextMode;
  /** 2 or 3 colours spread evenly; CSS angle (0 = bottom to top, 180 = top to bottom). */
  gradient: { colors: string[]; angle: number };
  stroke: { enabled: boolean; color: string; width: number; opacity: number };
  shadow: {
    enabled: boolean;
    color: string;
    opacity: number;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
};

/** Which text a style belongs to: the arched family name or a vertical inscription. */
export type PosterTextKind = 'name' | 'vertical';

export const STROKE_WIDTH_MAX = 20;
export const SHADOW_BLUR_MAX = 30;
export const SHADOW_OFFSET_MAX = 20;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

/**
 * The look a text had before styles existed, so a background saved without one renders unchanged:
 * the name was a pale-gold highlight fading into its colour with a thin dark outline and a warm
 * glow; the inscriptions were their plain colour with a dark glow.
 */
export function defaultTextStyle(kind: PosterTextKind, color: string): PosterTextStyle {
  if (kind === 'name') {
    return {
      mode: 'gradient',
      gradient: { colors: ['#fff6cf', color, color], angle: 180 },
      stroke: { enabled: true, color: '#500f00', width: 4.5, opacity: 45 },
      shadow: { enabled: true, color: '#ffe08a', opacity: 35, blur: 6, offsetX: 0, offsetY: 0 },
    };
  }
  return {
    mode: 'solid',
    gradient: { colors: ['#fff1d0', color], angle: 180 },
    stroke: { enabled: false, color: '#3c0a00', width: 3, opacity: 100 },
    shadow: { enabled: true, color: '#3c0a00', opacity: 65, blur: 4.5, offsetX: 0, offsetY: 0 },
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function colorOr(value: unknown, fallback: string): string {
  return isHexColor(value) ? value.toLowerCase() : fallback;
}

/**
 * A complete style from whatever was saved: null (older backgrounds) gives the built-in look, and
 * any missing or invalid field falls back to that look's value, so a partial style never breaks.
 */
export function resolveTextStyle(
  saved: unknown,
  kind: PosterTextKind,
  color: string,
): PosterTextStyle {
  const fallback = defaultTextStyle(kind, color);
  const style = record(saved);
  if (!style) return fallback;

  const gradient = record(style.gradient);
  const colors = Array.isArray(gradient?.colors) ? gradient.colors.filter(isHexColor) : [];
  const stroke = record(style.stroke);
  const shadow = record(style.shadow);
  return {
    mode: style.mode === 'solid' || style.mode === 'gradient' ? style.mode : fallback.mode,
    gradient: {
      colors:
        colors.length >= 2
          ? colors.slice(0, 3).map((value) => value.toLowerCase())
          : fallback.gradient.colors,
      angle: Math.round(numberIn(gradient?.angle, 0, 359, fallback.gradient.angle)),
    },
    stroke: {
      enabled: booleanOr(stroke?.enabled, fallback.stroke.enabled),
      color: colorOr(stroke?.color, fallback.stroke.color),
      width: numberIn(stroke?.width, 0, STROKE_WIDTH_MAX, fallback.stroke.width),
      opacity: numberIn(stroke?.opacity, 0, 100, fallback.stroke.opacity),
    },
    shadow: {
      enabled: booleanOr(shadow?.enabled, fallback.shadow.enabled),
      color: colorOr(shadow?.color, fallback.shadow.color),
      opacity: numberIn(shadow?.opacity, 0, 100, fallback.shadow.opacity),
      blur: numberIn(shadow?.blur, 0, SHADOW_BLUR_MAX, fallback.shadow.blur),
      offsetX: numberIn(
        shadow?.offsetX,
        -SHADOW_OFFSET_MAX,
        SHADOW_OFFSET_MAX,
        fallback.shadow.offsetX,
      ),
      offsetY: numberIn(
        shadow?.offsetY,
        -SHADOW_OFFSET_MAX,
        SHADOW_OFFSET_MAX,
        fallback.shadow.offsetY,
      ),
    },
  };
}

/** `#rrggbb` at a percent opacity, as an rgba() any renderer accepts. */
export function colorWithOpacity(hex: string, opacity: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const alpha = Math.round(Math.min(100, Math.max(0, opacity))) / 100;
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

/** Where a CSS-angle gradient starts and ends inside an SVG object bounding box. */
export function gradientVector(angle: number): { x1: number; y1: number; x2: number; y2: number } {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians) / 2;
  const dy = Math.cos(radians) / 2;
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return { x1: round(0.5 - dx), y1: round(0.5 + dy), x2: round(0.5 + dx), y2: round(0.5 - dy) };
}

/** Evenly spaced stops, shared by the SVG and CSS renderers. */
export function gradientStops(colors: readonly string[]): Array<{ offset: number; color: string }> {
  const last = Math.max(1, colors.length - 1);
  return colors.map((color, index) => ({ offset: index / last, color }));
}

export function cssGradient(gradient: PosterTextStyle['gradient']): string {
  const stops = gradientStops(gradient.colors)
    .map(({ offset, color }) => `${color} ${Math.round(offset * 100)}%`)
    .join(', ');
  return `linear-gradient(${gradient.angle}deg, ${stops})`;
}

export type PosterTextPreset = { id: string; name: string; color: string; style: PosterTextStyle };

const NO_STROKE: PosterTextStyle['stroke'] = {
  enabled: false,
  color: '#3c0a00',
  width: 3,
  opacity: 100,
};
const NO_SHADOW: PosterTextStyle['shadow'] = {
  enabled: false,
  color: '#000000',
  opacity: 40,
  blur: 4,
  offsetX: 0,
  offsetY: 0,
};

function outline(color: string, width: number, opacity = 100): PosterTextStyle['stroke'] {
  return { enabled: true, color, width, opacity };
}

function shade(
  color: string,
  opacity: number,
  blur: number,
  offsetY = 0,
): PosterTextStyle['shadow'] {
  return { enabled: true, color, opacity, blur, offsetX: 0, offsetY };
}

function preset(
  id: string,
  name: string,
  fill: string | string[],
  stroke: PosterTextStyle['stroke'],
  shadow: PosterTextStyle['shadow'],
): PosterTextPreset {
  const colors = typeof fill === 'string' ? [fill, fill] : fill;
  return {
    id,
    name,
    color: colors[Math.floor(colors.length / 2)] ?? colors[0] ?? '#d4af37',
    style: {
      mode: typeof fill === 'string' ? 'solid' : 'gradient',
      gradient: { colors, angle: 180 },
      stroke,
      shadow,
    },
  };
}

/** Ready-made looks for the arched family name (heavy serif capitals). */
export const NAME_TEXT_PRESETS: readonly PosterTextPreset[] = [
  preset(
    'gold-classic',
    'Vàng kim cổ điển',
    ['#fff1b8', '#d4af37', '#8a6516'],
    outline('#3d2200', 3.5, 70),
    shade('#000000', 40, 4, 1.5),
  ),
  preset(
    'gold-glow',
    'Vàng kim rực sáng',
    ['#fffbe0', '#ffd84a', '#f5b800'],
    outline('#6b3d00', 3, 60),
    shade('#ffd84a', 70, 10),
  ),
  preset(
    'gold-leaf',
    'Vàng dát lá',
    ['#f9e7a1', '#c9971c', '#f6d77a'],
    outline('#4a2a00', 3, 80),
    shade('#000000', 35, 3, 1),
  ),
  preset(
    'champagne',
    'Vàng champagne',
    ['#fff8e6', '#e8c878'],
    outline('#5a4020', 2.5, 50),
    shade('#000000', 30, 4, 1),
  ),
  preset(
    'bronze',
    'Đồng cổ',
    ['#f3c58b', '#b0702b', '#6e3b12'],
    outline('#2b1400', 3, 80),
    shade('#000000', 40, 3, 1.5),
  ),
  preset(
    'vermilion-gold',
    'Đỏ son viền vàng',
    '#b52b2b',
    outline('#f5d36b', 5),
    shade('#000000', 35, 4, 1.5),
  ),
  preset(
    'ivory',
    'Trắng ngà viền nâu',
    '#fff1d0',
    outline('#6b4226', 4, 90),
    shade('#000000', 45, 5, 1.5),
  ),
  preset(
    'jade-gold',
    'Xanh ngọc viền vàng',
    ['#2a9d8f', '#176b63'],
    outline('#f5d36b', 4),
    shade('#000000', 30, 4, 1),
  ),
  preset('agarwood', 'Nâu trầm', '#6b4226', outline('#f5e6b8', 4, 90), shade('#ffffff', 40, 4)),
  preset(
    'jet-gold',
    'Đen huyền viền vàng',
    '#292522',
    outline('#d4af37', 4),
    shade('#d4af37', 35, 6),
  ),
];

/** Ready-made looks for the vertical inscriptions (thin brush calligraphy). */
export const VERTICAL_TEXT_PRESETS: readonly PosterTextPreset[] = [
  preset(
    'gold-classic',
    'Vàng kim',
    ['#fff1b8', '#d4af37', '#a07a1c'],
    NO_STROKE,
    shade('#3c0a00', 65, 4.5),
  ),
  preset(
    'gold-glow',
    'Vàng rực sáng',
    '#ffd84a',
    outline('#6b3d00', 2, 60),
    shade('#ffd84a', 60, 8),
  ),
  preset('ivory-gold', 'Vàng ngà', '#f5e6b8', NO_STROKE, shade('#3c0a00', 70, 4.5)),
  preset('ivory', 'Trắng ngà', '#fff1d0', outline('#6b4226', 2, 70), shade('#000000', 50, 4)),
  preset(
    'bronze',
    'Đồng cổ',
    ['#f3c58b', '#b0702b', '#6e3b12'],
    NO_STROKE,
    shade('#000000', 40, 3.5, 1),
  ),
  preset('vermilion-gold', 'Đỏ son viền vàng', '#b52b2b', outline('#f5d36b', 2.5), NO_SHADOW),
  preset(
    'vermilion-glow',
    'Đỏ son ánh vàng',
    ['#d9473a', '#8f1d1d'],
    NO_STROKE,
    shade('#f5d36b', 50, 5),
  ),
  preset('agarwood', 'Nâu trầm', '#6b4226', NO_STROKE, shade('#fff1d0', 60, 4)),
  preset('jade', 'Xanh ngọc', '#176b63', outline('#f5e6b8', 2, 90), NO_SHADOW),
  preset('jet-gold', 'Đen huyền ánh kim', '#292522', NO_STROKE, shade('#d4af37', 45, 5)),
];

export function textPresetsFor(kind: PosterTextKind): readonly PosterTextPreset[] {
  return kind === 'name' ? NAME_TEXT_PRESETS : VERTICAL_TEXT_PRESETS;
}

/** The preset an area currently matches, or null for an older or hand-made look. */
export function matchingPreset(
  kind: PosterTextKind,
  color: string,
  style: PosterTextStyle | null,
): PosterTextPreset | null {
  if (!style) return null;
  const current = JSON.stringify(resolveTextStyle(style, kind, color));
  return (
    textPresetsFor(kind).find(
      (preset) =>
        preset.color === color.toLowerCase() &&
        JSON.stringify(resolveTextStyle(preset.style, kind, preset.color)) === current,
    ) ?? null
  );
}
