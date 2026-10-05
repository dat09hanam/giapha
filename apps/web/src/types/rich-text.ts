/**
 * Formatted text as the API stores it: blocks of styled runs, never HTML. Mirrors
 * `apps/api/src/common/validation/rich-text.ts`, which validates it.
 */
export type RichTextRun = {
  text: string;
  bold?: true;
  italic?: true;
  underline?: true;
  strike?: true;
  /** `#rrggbb`. */
  color?: string;
};

export type RichTextAlign = 'center' | 'right' | 'justify';

export type RichTextBlock =
  | {
      type: 'paragraph' | 'heading' | 'subheading' | 'quote';
      align?: RichTextAlign;
      content: RichTextRun[];
    }
  | { type: 'bulleted' | 'numbered'; align?: RichTextAlign; items: RichTextRun[][] };

export type RichTextDocument = { version: 1; blocks: RichTextBlock[] };
