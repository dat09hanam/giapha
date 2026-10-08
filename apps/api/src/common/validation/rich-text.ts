import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

/**
 * Formatted text as a small structured document rather than HTML: blocks of styled text runs.
 * Clients render it element by element, so nothing a writer types can become markup or script.
 * The web app keeps the matching types in `src/types/rich-text.ts`.
 */

const MAX_BLOCKS = 400;
const MAX_LIST_ITEMS = 200;
const MAX_RUNS_PER_LINE = 200;
const MAX_RUN_LENGTH = 5000;
/** All the text of one document, roughly forty printed pages. */
const MAX_TOTAL_LENGTH = 50_000;
/** `description`, the plain-text copy, is a 5,000 character column field elsewhere. */
const MAX_PLAIN_LENGTH = 5000;

const textRunSchema = z
  .object({
    text: z.string().max(MAX_RUN_LENGTH),
    bold: z.literal(true).optional(),
    italic: z.literal(true).optional(),
    underline: z.literal(true).optional(),
    strike: z.literal(true).optional(),
    /** `#rrggbb` only, so it can go straight into a style without escaping. */
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
  })
  .strict();

const lineSchema = z.array(textRunSchema).max(MAX_RUNS_PER_LINE);
const alignSchema = z.enum(['center', 'right', 'justify']).optional();

const blockSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.enum(['paragraph', 'heading', 'subheading', 'quote']),
      align: alignSchema,
      content: lineSchema,
    })
    .strict(),
  z
    .object({
      type: z.enum(['bulleted', 'numbered']),
      align: alignSchema,
      items: z.array(lineSchema).min(1).max(MAX_LIST_ITEMS),
    })
    .strict(),
]);

const documentSchema = z
  .object({ version: z.literal(1), blocks: z.array(blockSchema).max(MAX_BLOCKS) })
  .strict();

export type RichTextRun = z.infer<typeof textRunSchema>;
export type RichTextBlock = z.infer<typeof blockSchema>;
export type RichTextDocument = z.infer<typeof documentSchema>;

function sameMarks(a: RichTextRun, b: RichTextRun): boolean {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strike === b.strike &&
    a.color?.toLowerCase() === b.color?.toLowerCase()
  );
}

/** Drops empty runs and joins neighbours styled alike, so equal text compares equal. */
function normalizeLine(line: RichTextRun[]): RichTextRun[] {
  const result: RichTextRun[] = [];
  for (const run of line) {
    const text = run.text.replace(/\r\n?/g, '\n');
    if (!text) continue;
    const previous = result.at(-1);
    if (previous && sameMarks(previous, run)) {
      previous.text += text;
    } else {
      result.push({ ...run, text, ...(run.color ? { color: run.color.toLowerCase() } : {}) });
    }
  }
  return result;
}

function lineText(line: RichTextRun[]): string {
  return line.map((run) => run.text).join('');
}

function blockLines(block: RichTextBlock): RichTextRun[][] {
  return 'items' in block ? block.items : [block.content];
}

/**
 * Checks a document a client sent and returns it normalised, or null when it holds no text at
 * all. Anything outside the shape above is refused with `message`; `subject` names the text in
 * the too-long error.
 */
export function parseRichText(
  value: unknown,
  message: string,
  subject = 'Nội dung giới thiệu',
): RichTextDocument | null {
  const parsed = documentSchema.safeParse(value);
  if (!parsed.success) throw new BadRequestException(message);

  const blocks: RichTextBlock[] = parsed.data.blocks.map((block) =>
    'items' in block
      ? { ...block, items: block.items.map(normalizeLine) }
      : { ...block, content: normalizeLine(block.content) },
  );
  // Trailing empty paragraphs are where the cursor sat, not content.
  while (blocks.length > 0 && blockLines(blocks.at(-1)!).every((line) => !lineText(line).trim())) {
    blocks.pop();
  }
  const total = blocks.reduce(
    (sum, block) => sum + blockLines(block).reduce((n, line) => n + lineText(line).length, 0),
    0,
  );
  if (total > MAX_TOTAL_LENGTH) {
    throw new BadRequestException(
      `${subject} quá dài (tối đa ${MAX_TOTAL_LENGTH.toLocaleString('vi-VN')} ký tự).`,
    );
  }
  if (total === 0) return null;
  return { version: 1, blocks };
}

/** A stored document back out, or null if the column holds something else. */
export function readRichText(value: unknown): RichTextDocument | null {
  const parsed = documentSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** The document's words without formatting: one line per paragraph or list item. */
export function richTextToPlain(document: RichTextDocument): string {
  const text = document.blocks
    .flatMap((block) =>
      'items' in block
        ? block.items.map((line, index) =>
            `${block.type === 'numbered' ? `${index + 1}.` : '•'} ${lineText(line)}`.trim(),
          )
        : [lineText(block.content)],
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length <= MAX_PLAIN_LENGTH) return text;
  const cut = text.slice(0, MAX_PLAIN_LENGTH - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), MAX_PLAIN_LENGTH - 200))}…`;
}
