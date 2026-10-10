'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { FeedImage } from '@/lib/feed-api';
import { familyMediaSrc } from '@/lib/media-api';
import { cn } from '@/lib/utils';

const MIN_SINGLE_RATIO = 4 / 5;
const MAX_SINGLE_RATIO = 2;

function Photo({
  src,
  className,
  onOpen,
  label,
}: {
  src: string;
  className?: string;
  onOpen: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('relative block overflow-hidden bg-stone-200', className)}
      aria-label={label}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" className="size-full object-cover" draggable={false} />
    </button>
  );
}

export function PostImages({
  images,
  familySlug,
  onOpen,
}: {
  images: FeedImage[];
  familySlug: string;
  onOpen: (index: number) => void;
}) {
  const src = (image: FeedImage) => familyMediaSrc(familySlug, image.url);
  const label = (index: number) => `Xem ảnh ${index + 1} trên ${images.length}`;

  if (images.length === 1) {
    const [image] = images as [FeedImage];
    const ratio = Math.min(
      MAX_SINGLE_RATIO,
      Math.max(MIN_SINGLE_RATIO, image.width / image.height),
    );
    return (
      <div style={{ aspectRatio: ratio }} className="w-full">
        <Photo src={src(image)} className="size-full" onOpen={() => onOpen(0)} label={label(0)} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid w-full gap-0.5',
        images.length === 2 ? 'aspect-[2/1] grid-cols-2' : 'aspect-square grid-cols-2 grid-rows-2',
      )}
    >
      {images.map((image, index) => (
        <Photo
          key={image.url}
          src={src(image)}
          className={cn('size-full', images.length === 3 && index === 0 && 'row-span-2')}
          onOpen={() => onOpen(index)}
          label={label(index)}
        />
      ))}
    </div>
  );
}

export function ImageLightbox({
  images,
  familySlug,
  startIndex,
  onClose,
}: {
  images: FeedImage[];
  familySlug: string;
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);
  const image = images[index];

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') setIndex((current) => Math.max(0, current - 1));
      if (event.key === 'ArrowRight')
        setIndex((current) => Math.min(images.length - 1, current + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);

  if (!image) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh"
      className="ui-backdrop fixed inset-0 z-[80] flex flex-col bg-stone-950/40 text-white backdrop-blur-2xl"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (start === null || end === undefined || Math.abs(end - start) < 50) return;
        setIndex((current) =>
          end < start ? Math.min(images.length - 1, current + 1) : Math.max(0, current - 1),
        );
      }}
    >
      <div className="flex h-14 shrink-0 items-center justify-between px-3">
        <span className="text-sm text-white/70">
          {images.length > 1 ? `${index + 1} / ${images.length}` : ''}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
          aria-label="Đóng"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={image.url}
          src={familyMediaSrc(familySlug, image.url)}
          alt=""
          className="ui-dialog max-h-full max-w-full object-contain"
          draggable={false}
        />
        {index > 0 ? (
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            className="absolute left-2 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid"
            aria-label="Ảnh trước"
          >
            <ChevronLeft className="size-6" aria-hidden="true" />
          </button>
        ) : null}
        {index < images.length - 1 ? (
          <button
            type="button"
            onClick={() => setIndex(index + 1)}
            className="absolute right-2 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid"
            aria-label="Ảnh sau"
          >
            <ChevronRight className="size-6" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
