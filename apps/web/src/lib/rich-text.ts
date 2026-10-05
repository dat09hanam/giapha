import type {
  RichTextAlign,
  RichTextBlock,
  RichTextDocument,
  RichTextRun,
} from '@/types/rich-text';

/** The colours the editor offers; the API accepts any `#rrggbb`. */
export const RICH_TEXT_COLORS: readonly { value: string; label: string }[] = [
  { value: '#7c1f18', label: 'Đỏ son' },
  { value: '#c4432c', label: 'Đỏ cam' },
  { value: '#b45309', label: 'Vàng đồng' },
  { value: '#15803d', label: 'Xanh lá' },
  { value: '#1d4ed8', label: 'Xanh dương' },
  { value: '#6d28d9', label: 'Tím' },
  { value: '#57534e', label: 'Xám' },
];

export const EMPTY_RICH_TEXT: RichTextDocument = { version: 1, blocks: [] };

const HEX = /^#[0-9a-f]{6}$/i;

/** Older plain-text introductions become one paragraph per line, so they open in the editor. */
export function plainToRichText(text: string | null): RichTextDocument {
  if (!text?.trim()) return EMPTY_RICH_TEXT;
  return {
    version: 1,
    blocks: text.split(/\r?\n/).map((line) => ({
      type: 'paragraph' as const,
      content: line ? [{ text: line }] : [],
    })),
  };
}

export function richTextIsEmpty(document: RichTextDocument): boolean {
  return document.blocks.every((block) =>
    ('items' in block ? block.items : [block.content]).every((line) =>
      line.every((run) => !run.text.trim()),
    ),
  );
}

// ---------------------------------------------------------------------------------------------
// Document → HTML, only to seed the editor. Text is escaped and colours are checked, so nothing
// typed can become markup.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function runToHtml(run: RichTextRun): string {
  let html = escapeHtml(run.text).replace(/\n/g, '<br>');
  if (run.color && HEX.test(run.color)) html = `<span style="color:${run.color}">${html}</span>`;
  if (run.strike) html = `<s>${html}</s>`;
  if (run.underline) html = `<u>${html}</u>`;
  if (run.italic) html = `<i>${html}</i>`;
  if (run.bold) html = `<b>${html}</b>`;
  return html;
}

function lineToHtml(line: RichTextRun[]): string {
  const html = line.map(runToHtml).join('');
  // An empty line still needs a <br> to hold the caret.
  return html || '<br>';
}

const BLOCK_TAGS = { paragraph: 'p', heading: 'h2', subheading: 'h3', quote: 'blockquote' };

export function richTextToEditorHtml(document: RichTextDocument): string {
  if (document.blocks.length === 0) return '<p><br></p>';
  return document.blocks
    .map((block) => {
      const style = block.align ? ` style="text-align:${block.align}"` : '';
      if ('items' in block) {
        const tag = block.type === 'numbered' ? 'ol' : 'ul';
        const items = block.items.map((line) => `<li>${lineToHtml(line)}</li>`).join('');
        return `<${tag}${style}>${items}</${tag}>`;
      }
      const tag = BLOCK_TAGS[block.type];
      return `<${tag}${style}>${lineToHtml(block.content)}</${tag}>`;
    })
    .join('');
}

// ---------------------------------------------------------------------------------------------
// Editor DOM → document. Reads only the formatting the toolbar can make; anything else in the
// DOM is kept as plain text.

type Marks = Omit<RichTextRun, 'text'>;

/** `rgb(124, 31, 24)` or `#7C1F18` → `#7c1f18`; anything else is dropped. */
function normalizeColor(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  if (HEX.test(trimmed)) return trimmed;
  const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(trimmed);
  if (!rgb) return undefined;
  return `#${rgb
    .slice(1, 4)
    .map((part) => Number(part).toString(16).padStart(2, '0'))
    .join('')}`;
}

function marksOf(element: HTMLElement, inherited: Marks): Marks {
  const marks: Marks = { ...inherited };
  const tag = element.tagName;
  const style = element.style;
  if (
    tag === 'B' ||
    tag === 'STRONG' ||
    style.fontWeight === 'bold' ||
    Number(style.fontWeight) >= 600
  ) {
    marks.bold = true;
  }
  if (tag === 'I' || tag === 'EM' || style.fontStyle === 'italic') marks.italic = true;
  const decoration = `${style.textDecoration} ${style.textDecorationLine}`;
  if (tag === 'U' || decoration.includes('underline')) marks.underline = true;
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || decoration.includes('line-through')) {
    marks.strike = true;
  }
  const color = normalizeColor(style.color) ?? normalizeColor(element.getAttribute('color'));
  if (color) marks.color = color;
  return marks;
}

function collectRuns(node: Node, marks: Marks, runs: RichTextRun[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    // The editor shows text with pre-wrap, but a stray newline from the DOM is just a space.
    const text = (node.textContent ?? '').replace(/\n/g, ' ');
    if (text) runs.push({ text, ...marks });
    return;
  }
  if (!(node instanceof HTMLElement)) return;
  if (node.tagName === 'BR') {
    runs.push({ text: '\n', ...marks });
    return;
  }
  const next = marksOf(node, marks);
  node.childNodes.forEach((child) => collectRuns(child, next, runs));
}

/** Joins neighbours styled alike and drops a lone trailing line break the browser adds. */
function tidyLine(runs: RichTextRun[]): RichTextRun[] {
  const result: RichTextRun[] = [];
  for (const run of runs) {
    const previous = result.at(-1);
    const same =
      previous &&
      previous.bold === run.bold &&
      previous.italic === run.italic &&
      previous.underline === run.underline &&
      previous.strike === run.strike &&
      previous.color === run.color;
    if (same) previous.text += run.text;
    else result.push({ ...run });
  }
  const last = result.at(-1);
  if (last?.text.endsWith('\n')) {
    last.text = last.text.slice(0, -1);
    if (!last.text) result.pop();
  }
  return result;
}

function lineOf(element: Node): RichTextRun[] {
  const runs: RichTextRun[] = [];
  element.childNodes.forEach((child) => collectRuns(child, {}, runs));
  return tidyLine(runs);
}

function alignOf(element: HTMLElement): RichTextAlign | undefined {
  const align = (element.style.textAlign || element.getAttribute('align') || '').toLowerCase();
  return align === 'center' || align === 'right' || align === 'justify' ? align : undefined;
}

function withAlign<T extends RichTextBlock>(block: T, align: RichTextAlign | undefined): T {
  return align ? { ...block, align } : block;
}

const INLINE_TAGS = new Set([
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'S',
  'STRIKE',
  'DEL',
  'SPAN',
  'FONT',
  'BR',
]);
const BLOCK_TAGS_IN_DOM = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'UL', 'OL']);

/** Reads `container`'s children as a run of blocks, descending into wrappers that hold blocks. */
function readBlocks(container: Node, blocks: RichTextBlock[]): void {
  // Text typed straight into a container, outside any block, gathers into one paragraph.
  let loose: Node[] = [];
  const flushLoose = (): void => {
    if (loose.length === 0) return;
    const holder = document.createElement('p');
    loose.forEach((node) => holder.append(node.cloneNode(true)));
    blocks.push({ type: 'paragraph', content: lineOf(holder) });
    loose = [];
  };

  container.childNodes.forEach((node) => {
    if (!(node instanceof HTMLElement) || INLINE_TAGS.has(node.tagName)) {
      loose.push(node);
      return;
    }
    flushLoose();
    const align = alignOf(node);
    // Browsers sometimes wrap a list or paragraphs in a <div> or <p>; read what is inside.
    const wrapsBlocks = [...node.children].some((child) => BLOCK_TAGS_IN_DOM.has(child.tagName));
    switch (node.tagName) {
      case 'H1':
      case 'H2':
        blocks.push(withAlign({ type: 'heading', content: lineOf(node) }, align));
        break;
      case 'H3':
      case 'H4':
        blocks.push(withAlign({ type: 'subheading', content: lineOf(node) }, align));
        break;
      case 'BLOCKQUOTE':
        blocks.push(withAlign({ type: 'quote', content: lineOf(node) }, align));
        break;
      case 'UL':
      case 'OL': {
        const items = [...node.children]
          .filter((child) => child.tagName === 'LI')
          .map((child) => lineOf(child));
        if (items.length > 0) {
          blocks.push(
            withAlign({ type: node.tagName === 'OL' ? 'numbered' : 'bulleted', items }, align),
          );
        }
        break;
      }
      default:
        if (wrapsBlocks) readBlocks(node, blocks);
        else blocks.push(withAlign({ type: 'paragraph', content: lineOf(node) }, align));
    }
  });
  flushLoose();
}

export function editorDomToRichText(root: HTMLElement): RichTextDocument {
  const blocks: RichTextBlock[] = [];
  readBlocks(root, blocks);

  // Trailing empty paragraphs are where the caret sat, not content.
  while (blocks.length > 0) {
    const last = blocks.at(-1)!;
    if ('items' in last || last.content.some((run) => run.text.trim())) break;
    blocks.pop();
  }
  return { version: 1, blocks };
}
