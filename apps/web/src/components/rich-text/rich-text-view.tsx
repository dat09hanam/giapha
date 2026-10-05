import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { RichTextBlock, RichTextDocument, RichTextRun } from '@/types/rich-text';

const HEX = /^#[0-9a-f]{6}$/i;

function Run({ run }: { run: RichTextRun }) {
  let node: ReactNode = run.text;
  if (run.color && HEX.test(run.color)) node = <span style={{ color: run.color }}>{node}</span>;
  if (run.strike) node = <s>{node}</s>;
  if (run.underline) node = <u>{node}</u>;
  if (run.italic) node = <em>{node}</em>;
  if (run.bold) node = <strong>{node}</strong>;
  return <>{node}</>;
}

function Line({ line }: { line: RichTextRun[] }) {
  return (
    <>
      {line.map((run, index) => (
        <Run key={index} run={run} />
      ))}
    </>
  );
}

function Block({ block }: { block: RichTextBlock }) {
  const style: CSSProperties | undefined = block.align ? { textAlign: block.align } : undefined;
  switch (block.type) {
    case 'heading':
      return (
        <h2 style={style} className="font-display text-2xl font-bold leading-snug text-brand-800">
          <Line line={block.content} />
        </h2>
      );
    case 'subheading':
      return (
        <h3 style={style} className="text-lg font-semibold leading-snug text-brand-900">
          <Line line={block.content} />
        </h3>
      );
    case 'quote':
      return (
        <blockquote
          style={style}
          className="border-l-4 border-brand-300 bg-brand-50/60 py-2 pl-4 pr-3 italic text-stone-700"
        >
          <Line line={block.content} />
        </blockquote>
      );
    case 'bulleted':
    case 'numbered': {
      const List = block.type === 'numbered' ? 'ol' : 'ul';
      return (
        <List
          style={style}
          className={cn(
            'grid gap-1 pl-6 marker:text-brand-700',
            block.type === 'numbered' ? 'list-decimal' : 'list-disc',
          )}
        >
          {block.items.map((item, index) => (
            <li key={index}>
              <Line line={item} />
            </li>
          ))}
        </List>
      );
    }
    default:
      // An empty paragraph is a deliberate blank line.
      return (
        <p style={style} className="min-h-[1lh]">
          <Line line={block.content} />
        </p>
      );
  }
}

/**
 * A formatted document, built element by element: text is always text, so nothing the writer
 * typed can turn into markup. Renders on the server.
 */
export function RichTextView({
  document,
  className,
}: {
  document: RichTextDocument;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-3 whitespace-pre-wrap break-words text-[15px] leading-7 text-stone-800',
        className,
      )}
    >
      {document.blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}
