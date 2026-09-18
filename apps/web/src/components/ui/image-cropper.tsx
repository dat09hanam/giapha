'use client';

import { Check, Crop, Minus, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

/** Side of the square preview the visitor drags the photo inside. */
const VIEWPORT = 288;
/** Side of the exported square, comfortably sharp for an avatar. */
const OUTPUT = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.2;

type Offset = { x: number; y: number };

type Source = {
  image: HTMLImageElement;
  /** Scale at which the photo exactly covers the viewport. */
  baseScale: number;
};

function clampOffset(offset: Offset, source: Source, zoom: number): Offset {
  const scale = source.baseScale * zoom;
  const minX = VIEWPORT - source.image.naturalWidth * scale;
  const minY = VIEWPORT - source.image.naturalHeight * scale;

  return {
    x: Math.min(0, Math.max(minX, offset.x)),
    y: Math.min(0, Math.max(minY, offset.y)),
  };
}

function centeredOffset(source: Source, zoom: number): Offset {
  const scale = source.baseScale * zoom;
  return {
    x: (VIEWPORT - source.image.naturalWidth * scale) / 2,
    y: (VIEWPORT - source.image.naturalHeight * scale) / 2,
  };
}

export function ImageCropper({
  file,
  onCancel,
  onCropped,
}: {
  file: File;
  onCancel: () => void;
  onCropped: (cropped: File) => void;
}) {
  const [source, setSource] = useState<Source | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const drag = useRef<{ pointerId: number; startX: number; startY: number; from: Offset } | null>(
    null,
  );

  useEffect(() => {
    // The cleanup revokes the URL, which aborts an in-flight decode and fires
    // onerror. Without this flag a re-run (React StrictMode) would report the
    // superseded load as a failure while the new one succeeds.
    let cancelled = false;
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    setLoadError(null);
    image.onload = () => {
      if (cancelled) return;

      const baseScale = VIEWPORT / Math.min(image.naturalWidth, image.naturalHeight);
      const loaded = { image, baseScale };
      setSource(loaded);
      setZoom(MIN_ZOOM);
      setOffset(centeredOffset(loaded, MIN_ZOOM));
    };
    image.onerror = () => {
      if (!cancelled) setLoadError('Không mở được ảnh này. Hãy thử một tệp khác.');
    };
    image.src = objectUrl;

    return () => {
      cancelled = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  function changeZoom(nextZoom: number): void {
    if (!source) return;

    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    const ratio = clampedZoom / zoom;
    setZoom(clampedZoom);
    // Zoom around the middle of the viewport so the framing stays put.
    setOffset((current) =>
      clampOffset(
        {
          x: VIEWPORT / 2 - (VIEWPORT / 2 - current.x) * ratio,
          y: VIEWPORT / 2 - (VIEWPORT / 2 - current.y) * ratio,
        },
        source,
        clampedZoom,
      ),
    );
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>): void {
    if (!source) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      from: offset,
    };
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>): void {
    const active = drag.current;
    if (!active || !source || active.pointerId !== event.pointerId) return;

    setOffset(
      clampOffset(
        {
          x: active.from.x + (event.clientX - active.startX),
          y: active.from.y + (event.clientY - active.startY),
        },
        source,
        zoom,
      ),
    );
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>): void {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  function confirmCrop(): void {
    if (!source) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const context = canvas.getContext('2d');
    if (!context) {
      setLoadError('Trình duyệt không hỗ trợ cắt ảnh.');
      return;
    }

    const scale = source.baseScale * zoom;
    // JPEG has no transparency, so flatten onto white instead of black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, OUTPUT, OUTPUT);
    context.drawImage(
      source.image,
      -offset.x / scale,
      -offset.y / scale,
      VIEWPORT / scale,
      VIEWPORT / scale,
      0,
      0,
      OUTPUT,
      OUTPUT,
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setLoadError('Không tạo được ảnh sau khi cắt.');
          return;
        }

        onCropped(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9,
    );
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-emerald-950/45 backdrop-blur-[2px]"
        aria-label="Đóng hộp cắt ảnh"
        onClick={onCancel}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-cropper-title"
        className="relative w-full max-w-md rounded-3xl border border-amber-900/15 bg-[#fffdf8] p-5 shadow-2xl sm:p-6"
      >
        <button
          type="button"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
          onClick={onCancel}
          aria-label="Đóng"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
          Ảnh đại diện
        </p>
        <h2 id="image-cropper-title" className="mt-2 pr-10 text-xl font-semibold text-emerald-950">
          Chọn vùng hiển thị
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Kéo ảnh để chỉnh vị trí và dùng thanh phóng to để chọn khung phù hợp.
        </p>

        {loadError ? (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        ) : null}

        <div
          className="relative mx-auto mt-5 touch-none overflow-hidden rounded-2xl border border-amber-900/20 bg-stone-100"
          style={{ width: VIEWPORT, height: VIEWPORT, cursor: source ? 'grab' : 'default' }}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {source ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={source.image.src}
              alt="Ảnh đang được cắt"
              draggable={false}
              className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
              style={{
                width: source.image.naturalWidth * source.baseScale * zoom,
                height: source.image.naturalHeight * source.baseScale * zoom,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          ) : (
            <span className="grid size-full place-items-center text-sm text-stone-500">
              Đang mở ảnh…
            </span>
          )}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/70"
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="grid size-9 shrink-0 place-items-center rounded-lg border bg-white text-stone-600 transition hover:text-emerald-900 disabled:opacity-40"
            aria-label="Thu nhỏ"
            disabled={!source || zoom <= MIN_ZOOM}
            onClick={() => changeZoom(zoom - ZOOM_STEP)}
          >
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!source}
            aria-label="Mức phóng to ảnh"
            className="h-1.5 min-w-0 flex-1 accent-emerald-700"
            onChange={(event) => changeZoom(Number(event.currentTarget.value))}
          />
          <button
            type="button"
            className="grid size-9 shrink-0 place-items-center rounded-lg border bg-white text-stone-600 transition hover:text-emerald-900 disabled:opacity-40"
            aria-label="Phóng to"
            disabled={!source || zoom >= MAX_ZOOM}
            onClick={() => changeZoom(zoom + ZOOM_STEP)}
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="button" disabled={!source} onClick={confirmCrop}>
            <Check className="size-4" aria-hidden="true" />
            Lưu ảnh
          </Button>
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-stone-500">
          <Crop className="size-3.5" aria-hidden="true" />
          Ảnh được cắt vuông {OUTPUT}×{OUTPUT} trước khi tải lên.
        </p>
      </section>
    </div>
  );
}
