export type RichTextRun = {
  text: string;
  bold?: true;
  italic?: true;
  underline?: true;
  strike?: true;
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
