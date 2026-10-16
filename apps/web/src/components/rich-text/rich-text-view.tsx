import type { CSSProperties, ReactNode } from 'react';

import { isExternalLink, normalizeLink, type RichTextImageSrc } from '@/lib/rich-text';
import { cn } from '@/lib/utils';
import type {
  RichTextBlock,
  RichTextDocument,
  RichTextImage,
  RichTextRun,
} from '@/types/rich-text';

const HEX = /^#[0-9a-f]{6}$/i;

function Run({ run }: { run: RichTextRun }) {
  let node: ReactNode = run.text;
  if (run.color && HEX.test(run.color)) node = <span style={{ color: run.color }}>{node}</span>;
  if (run.strike) node = <s>{node}</s>;
  if (run.underline) node = <u>{node}</u>;
  if (run.italic) node = <em>{node}</em>;
  if (run.bold) node = <strong>{node}</strong>;
  const link = normalizeLink(run.link);
  if (link) {
    const external = isExternalLink(link);
    node = (
      <a
        href={link}
        className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-4 transition hover:text-brand-900 hover:decoration-brand-700"
        {...(external ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {})}
      >
        {node}
      </a>
    );
  }
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

function Figure({ image, imageSrc }: { image: RichTextImage; imageSrc: RichTextImageSrc }) {
  return (
    <figure className="my-2 grid justify-items-center gap-2 whitespace-normal">
      {/* Served by the API at its own size; next/image would need the API host whitelisted. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc(image.file)}
        alt={image.caption ?? ''}
        width={image.width}
        height={image.height}
        loading="lazy"
        decoding="async"
        className="h-auto max-h-[80vh] w-auto max-w-full rounded-xl border border-gold-500/25 object-contain shadow-[0_18px_30px_-24px_rgba(74,46,18,0.6)]"
      />
      {image.caption ? (
        <figcaption className="max-w-prose text-center text-sm italic leading-6 text-stone-500">
          {image.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function Block({ block, imageSrc }: { block: RichTextBlock; imageSrc?: RichTextImageSrc }) {
  if (block.type === 'image') {
    return imageSrc ? <Figure image={block} imageSrc={imageSrc} /> : null;
  }
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
      return (
        <p style={style} className="min-h-[1lh]">
          <Line line={block.content} />
        </p>
      );
  }
}

export function RichTextView({
  document,
  className,
  imageSrc,
}: {
  document: RichTextDocument;
  className?: string;
  /** Where stored pictures load from; without it picture blocks are not shown. */
  imageSrc?: RichTextImageSrc;
}) {
  return (
    <div
      className={cn(
        'grid gap-3 whitespace-pre-wrap break-words text-[15px] leading-7 text-stone-800',
        className,
      )}
    >
      {document.blocks.map((block, index) => (
        <Block key={index} block={block} imageSrc={imageSrc} />
      ))}
    </div>
  );
}
