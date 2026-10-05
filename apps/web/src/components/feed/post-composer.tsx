'use client';

import { ImagePlus, LoaderCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { NameAvatar } from '@/components/feed/feed-format';
import {
  isViewerNameFixed,
  setViewerName,
  useViewerName,
} from '@/components/feed/use-viewer-name';
import { Button } from '@/components/ui/button';
import { Presence } from '@/components/ui/presence';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  createFeedPost,
  MAX_FEED_IMAGE_BYTES,
  MAX_POST_IMAGES,
  type FeedPost,
} from '@/lib/feed-api';
import { compressImage, type CompressedImage } from '@/lib/image-compress';
import { cn } from '@/lib/utils';

function ComposerDialog({
  familySlug,
  initialFiles,
  onClose,
  onCreated,
}: {
  familySlug: string;
  /** Photos picked from the feed's photo button, before the dialog opened. */
  initialFiles: File[];
  onClose: () => void;
  onCreated: (post: FeedPost) => void;
}) {
  const showToast = useToast();
  const savedName = useViewerName();
  const [name, setName] = useState(savedName);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<CompressedImage[]>([]);
  const [preparing, setPreparing] = useState(0);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const initialFilesRef = useRef(initialFiles);
  useEffect(() => {
    if (initialFilesRef.current.length > 0) void addPhotos(initialFilesRef.current);
    // Only the files the dialog opened with, once.
  }, []);

  // Previews of photos that were never posted.
  useEffect(
    () => () => imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl)),
    [],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !posting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, posting]);

  async function addPhotos(files: File[]): Promise<void> {
    const room = MAX_POST_IMAGES - imagesRef.current.length - preparing;
    if (files.length > room) {
      showToast({ kind: 'error', message: `Mỗi bài viết có tối đa ${MAX_POST_IMAGES} ảnh.` });
    }
    const accepted = files.slice(0, Math.max(0, room));
    setPreparing((count) => count + accepted.length);
    for (const file of accepted) {
      try {
        const image = await compressImage(file, MAX_FEED_IMAGE_BYTES);
        setImages((current) => [...current, image]);
      } catch (error) {
        showToast({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Không đọc được ảnh.',
        });
      } finally {
        setPreparing((count) => count - 1);
      }
    }
  }

  function removeImage(index: number): void {
    setImages((current) => {
      const removed = current[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((_, position) => position !== index);
    });
  }

  const authorName = name.trim();
  const canPost =
    Boolean(authorName) && (content.trim() || images.length > 0) && !posting && preparing === 0;

  async function post(): Promise<void> {
    if (!canPost) return;
    setPosting(true);
    try {
      const created = await createFeedPost(familySlug, {
        authorName,
        content,
        images: images.map(({ contentType, data, width, height }) => ({
          contentType,
          data,
          width,
          height,
        })),
      });
      setViewerName(authorName);
      onCreated(created);
      onClose();
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'đăng bài') });
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid items-end sm:place-items-center sm:p-4">
      <button
        type="button"
        className="ui-backdrop absolute inset-0 bg-stone-950/50 backdrop-blur-[2px]"
        aria-label="Đóng"
        tabIndex={-1}
        onClick={() => !posting && onClose()}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="composer-title"
        className="ui-sheet-dialog relative flex max-h-[92%] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-stone-200">
          <h2 id="composer-title" className="text-lg font-bold text-stone-900">
            Tạo bài viết
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={posting}
            className="absolute right-3 grid size-9 place-items-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200"
            aria-label="Đóng"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="grid min-h-0 gap-3 overflow-y-auto px-4 py-3">
          <div className="flex items-center gap-2.5">
            <NameAvatar name={authorName || '?'} />
            {isViewerNameFixed() ? (
              <p className="min-w-0 flex-1 truncate font-semibold text-stone-900">{name}</p>
            ) : (
              <input
                className="h-10 min-w-0 flex-1 rounded-xl border border-transparent bg-stone-100 px-3 text-base font-semibold text-stone-900 outline-none placeholder:font-normal placeholder:text-stone-500 focus:border-brand-700 focus:bg-white sm:text-sm"
                placeholder="Tên của bạn"
                aria-label="Tên của bạn"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                autoComplete="name"
              />
            )}
          </div>

          <textarea
            className={cn(
              'field-sizing-content min-h-28 w-full resize-none bg-transparent leading-snug text-stone-900 outline-none placeholder:text-stone-400',
              content.length < 90 && images.length === 0 ? 'text-2xl' : 'text-base',
            )}
            placeholder={`Bạn đang nghĩ gì${authorName ? `, ${authorName.split(/\s+/).at(-1)}` : ''}?`}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={5000}
            autoFocus={initialFiles.length === 0}
          />

          {images.length > 0 || preparing > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {images.map((image, index) => (
                <div
                  key={image.previewUrl}
                  className="ui-dialog relative aspect-square overflow-hidden rounded-xl bg-stone-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.previewUrl} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-white/90 text-stone-700 shadow hover:bg-white"
                    aria-label={`Bỏ ảnh ${index + 1}`}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              {Array.from({ length: preparing }, (_, index) => (
                <div
                  key={`preparing-${index}`}
                  className="grid aspect-square animate-pulse place-items-center rounded-xl bg-stone-100 text-stone-400"
                >
                  <LoaderCircle className="size-6 animate-spin" aria-label="Đang xử lý ảnh" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <footer className="grid shrink-0 gap-3 border-t border-stone-200 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:pb-3">
          <div className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2">
            <span className="text-sm font-semibold text-stone-700">Thêm vào bài viết</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length + preparing >= MAX_POST_IMAGES}
              className="grid size-9 place-items-center rounded-full text-brand-700 hover:bg-brand-50 disabled:text-stone-300"
              aria-label="Thêm ảnh"
            >
              <ImagePlus className="size-6" aria-hidden="true" />
            </button>
          </div>
          <Button
            type="button"
            className="h-11 w-full"
            disabled={!canPost}
            onClick={() => void post()}
          >
            {posting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {posting ? 'Đang đăng…' : 'Đăng'}
          </Button>
        </footer>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = '';
            void addPhotos(files);
          }}
        />
      </section>
    </div>
  );
}

/** "Bạn đang nghĩ gì?" at the top of the feed; opens the post dialog. */
export function PostComposer({
  familySlug,
  onCreated,
  className,
}: {
  familySlug: string;
  onCreated: (post: FeedPost) => void;
  className?: string;
}) {
  const viewerName = useViewerName();
  // The open dialog and the photos it starts with.
  const [open, setOpen] = useState<File[] | null>(null);
  // Clicked straight from the tap: iOS only opens the photo picker from a user gesture.
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn('surface px-4 py-3', className)}>
      <div className="flex items-center gap-2.5">
        <NameAvatar name={viewerName || '?'} />
        <button
          type="button"
          onClick={() => setOpen([])}
          className="h-10 min-w-0 flex-1 truncate rounded-full bg-paper px-4 text-left text-[15px] text-stone-500 ring-1 ring-inset ring-line transition hover:bg-paper-deep"
        >
          Bạn đang nghĩ gì?
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="grid size-10 shrink-0 place-items-center rounded-full text-brand-700 hover:bg-brand-50"
          aria-label="Đăng ảnh"
        >
          <ImagePlus className="size-6" aria-hidden="true" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          if (files.length > 0) setOpen(files);
        }}
      />

      <Presence>
        {open ? (
          <ComposerDialog
            familySlug={familySlug}
            initialFiles={open}
            onClose={() => setOpen(null)}
            onCreated={onCreated}
          />
        ) : null}
      </Presence>
    </div>
  );
}
