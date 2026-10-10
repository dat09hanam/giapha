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
