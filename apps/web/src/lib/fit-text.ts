/** Line height used wherever fitted text is drawn. */
export const FITTED_LINE_HEIGHT = 1.2;

let context: CanvasRenderingContext2D | null | undefined;
const cache = new Map<string, number>();

function measureContext(): CanvasRenderingContext2D | null {
  if (context === undefined) {
    context =
      typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  }
  return context;
}

/** Breaks words into lines no wider than `maxWidth` at the context's current font. */
function wrap(
  ctx: CanvasRenderingContext2D,
  words: readonly string[],
  maxWidth: number,
): string[] | null {
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (ctx.measureText(word).width > maxWidth) return null;
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * The largest font size, in pixels, at which `text` wraps into at most
 * `maxLines` lines inside a `width` × `height` box, between `minSize` and
 * `maxSize`. Words are never broken. Outside the browser, `fallback` is used.
 */
export function fitTextSize({
  text,
  width,
  height,
  font,
  minSize,
  maxSize,
  maxLines,
  fallback,
}: {
  text: string;
  width: number;
  height: number;
  /** CSS font without the size, such as `700 Inter, sans-serif`. */
  font: string;
  minSize: number;
  maxSize: number;
  maxLines: number;
  fallback: number;
}): number {
  const ctx = measureContext();
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!ctx || words.length === 0 || width <= 0 || height <= 0) return fallback;

  const key = [text, width, height, font, minSize, maxSize, maxLines].join('|');
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  let size = minSize;
  for (let candidate = maxSize; candidate > minSize; candidate -= 0.5) {
    const [weight, ...family] = font.split(' ');
    ctx.font = `${weight} ${candidate}px ${family.join(' ')}`;
    const lines = wrap(ctx, words, width);
    if (
      lines &&
      lines.length <= maxLines &&
      lines.length * candidate * FITTED_LINE_HEIGHT <= height
    ) {
      size = candidate;
      break;
    }
  }
  cache.set(key, size);
  return size;
}
