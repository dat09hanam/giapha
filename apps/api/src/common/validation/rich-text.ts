import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const MAX_BLOCKS = 400;
const MAX_LIST_ITEMS = 200;
const MAX_RUNS_PER_LINE = 200;
const MAX_RUN_LENGTH = 5000;
const MAX_TOTAL_LENGTH = 50_000;
const MAX_PLAIN_LENGTH = 5000;
const MAX_IMAGES = 60;
const MAX_CAPTION_LENGTH = 300;
const MAX_IMAGE_EDGE = 20_000;
const MAX_LINK_LENGTH = 500;

/** Where a link may point: the web (http/https), a page of this site, an email or a phone. */
const LINK =
  /^(https?:\/\/[^\s<>"'`]+|\/(?!\/)[^\s<>"'`]*|mailto:[^\s<>"'`]+|tel:\+?[0-9.\- ]{3,20})$/i;

/** A picture stored by the API (`{uuid}.{jpg|png|webp}`); never a link to somewhere else. */
const IMAGE_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

const textRunSchema = z
  .object({
    text: z.string().max(MAX_RUN_LENGTH),
    bold: z.literal(true).optional(),
    italic: z.literal(true).optional(),
    underline: z.literal(true).optional(),
    strike: z.literal(true).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    link: z.string().max(MAX_LINK_LENGTH).regex(LINK).optional(),
  })
  .strict();

const lineSchema = z.array(textRunSchema).max(MAX_RUNS_PER_LINE);
const alignSchema = z.enum(['center', 'right', 'justify']).optional();

const imageBlockSchema = z
  .object({
    type: z.literal('image'),
    file: z.string().regex(IMAGE_FILE),
    width: z.number().int().min(1).max(MAX_IMAGE_EDGE),
    height: z.number().int().min(1).max(MAX_IMAGE_EDGE),
    caption: z.string().max(MAX_CAPTION_LENGTH).optional(),
  })
  .strict();

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
  imageBlockSchema,
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
    a.color?.toLowerCase() === b.color?.toLowerCase() &&
    a.link === b.link
  );
}

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
  if (block.type === 'image') return [];
  return 'items' in block ? block.items : [block.content];
}

function isBlank(block: RichTextBlock): boolean {
  return block.type !== 'image' && blockLines(block).every((line) => !lineText(line).trim());
}

function normalizeBlock(block: RichTextBlock): RichTextBlock {
  if (block.type === 'image') {
    const caption = block.caption?.replace(/\s+/g, ' ').trim();
    const { type, file, width, height } = block;
    return caption ? { type, file, width, height, caption } : { type, file, width, height };
  }
  return 'items' in block
    ? { ...block, items: block.items.map(normalizeLine) }
    : { ...block, content: normalizeLine(block.content) };
}

/**
 * Validates an editor document. Picture blocks and links are refused unless `allowImages` /
 * `allowLinks` is set, so only articles (written by the platform admin) can carry them.
 */
export function parseRichText(
  value: unknown,
  message: string,
  subject = 'Nội dung giới thiệu',
  { allowImages = false, allowLinks = false }: { allowImages?: boolean; allowLinks?: boolean } = {},
): RichTextDocument | null {
  const parsed = documentSchema.safeParse(value);
  if (!parsed.success) throw new BadRequestException(message);

  const blocks = parsed.data.blocks.map(normalizeBlock);
  const images = blocks.filter((block) => block.type === 'image').length;
  if (images > 0 && !allowImages) throw new BadRequestException(message);
  const hasLinks = blocks.some((block) =>
    blockLines(block).some((line) => line.some((run) => run.link)),
  );
  if (hasLinks && !allowLinks) throw new BadRequestException(message);
  if (images > MAX_IMAGES) {
    throw new BadRequestException(`${subject} có tối đa ${MAX_IMAGES} hình ảnh.`);
  }
  while (blocks.length > 0 && isBlank(blocks.at(-1)!)) {
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
  if (total === 0 && images === 0) return null;
  return { version: 1, blocks };
}

/** Stored picture files a document shows, so the caller can delete the ones it dropped. */
export function richTextImageFiles(document: RichTextDocument | null): string[] {
  return (document?.blocks ?? []).flatMap((block) => (block.type === 'image' ? [block.file] : []));
}

export function readRichText(value: unknown): RichTextDocument | null {
  const parsed = documentSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function richTextToPlain(document: RichTextDocument): string {
  const text = document.blocks
    .flatMap((block) =>
      block.type === 'image'
        ? block.caption
          ? [block.caption]
          : []
        : 'items' in block
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
