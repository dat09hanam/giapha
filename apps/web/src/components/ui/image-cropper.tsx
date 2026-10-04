'use client';

import { Check, Crop, Minus, Plus, RotateCcw, RotateCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

/** Side of the square preview the visitor drags the photo inside. */
const VIEWPORT = 288;
/** Side of the exported square, comfortably sharp for an avatar. */
const OUTPUT = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.2;
/** Fine straightening, in degrees either way, on top of quarter turns. */
const MAX_TILT = 45;

/** Where the photo's center sits relative to the viewport's center, in viewport pixels. */
type Pan = { x: number; y: number };

type Source = { image: HTMLImageElement; width: number; height: number };

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * How far the viewport reaches from its center along the photo's own axes when
 * the photo is turned by `degrees`: a turned square needs a larger box.
 */
function viewportReach(degrees: number): number {
  const angle = radians(degrees);
  return (VIEWPORT / 2) * (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle)));
}

/** The photo's scale: at zoom 1 its shorter side just covers the turned viewport. */
function photoScale(source: Source, degrees: number, zoom: number): number {
  return ((2 * viewportReach(degrees)) / Math.min(source.width, source.height)) * zoom;
}

/**
 * Keeps the photo covering the whole viewport: the viewport's center, seen in
 * the photo's own (turned) axes, may only move as far as the photo has room.
 */
function clampPan(pan: Pan, source: Source, degrees: number, zoom: number): Pan {
  const angle = radians(degrees);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const scale = photoScale(source, degrees, zoom);
  const reach = viewportReach(degrees);
  const roomX = Math.max(0, (source.width * scale) / 2 - reach);
  const roomY = Math.max(0, (source.height * scale) / 2 - reach);

  // The viewport center relative to the photo center, turned back into photo axes.
  const localX = -pan.x * cos - pan.y * sin;
  const localY = pan.x * sin - pan.y * cos;
  const clampedX = Math.min(roomX, Math.max(-roomX, localX));
  const clampedY = Math.min(roomY, Math.max(-roomY, localY));

  return {
    x: -(clampedX * cos - clampedY * sin),
    y: -(clampedX * sin + clampedY * cos),
  };
}

function RoundButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="grid size-9 shrink-0 place-items-center rounded-lg border bg-white text-stone-600 transition hover:text-emerald-900 disabled:opacity-40"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
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
  const [quarterTurns, setQuarterTurns] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const drag = useRef<{ pointerId: number; startX: number; startY: number; from: Pan } | null>(
    null,
  );
  const rotation = quarterTurns * 90 + tilt;

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

      setSource({ image, width: image.naturalWidth, height: image.naturalHeight });
      setZoom(MIN_ZOOM);
      setQuarterTurns(0);
      setTilt(0);
      setPan({ x: 0, y: 0 });
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
    setPan((current) =>
      clampPan({ x: current.x * ratio, y: current.y * ratio }, source, rotation, clampedZoom),
    );
  }

  function changeRotation(nextQuarterTurns: number, nextTilt: number): void {
    if (!source) return;

    const turns = ((nextQuarterTurns % 4) + 4) % 4;
    const clampedTilt = Math.min(MAX_TILT, Math.max(-MAX_TILT, nextTilt));
    setQuarterTurns(turns);
    setTilt(clampedTilt);
    // Turning about the viewport center: the photo's center swings around it.
    const delta = radians(turns * 90 + clampedTilt - rotation);
    setPan((current) =>
      clampPan(
        {
          x: current.x * Math.cos(delta) - current.y * Math.sin(delta),
          y: current.x * Math.sin(delta) + current.y * Math.cos(delta),
        },
        source,
        turns * 90 + clampedTilt,
        zoom,
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
      from: pan,
    };
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>): void {
    const active = drag.current;
    if (!active || !source || active.pointerId !== event.pointerId) return;

    setPan(
      clampPan(
        {
          x: active.from.x + (event.clientX - active.startX),
          y: active.from.y + (event.clientY - active.startY),
        },
        source,
        rotation,
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

    const scale = photoScale(source, rotation, zoom);
    // JPEG has no transparency, so flatten onto white instead of black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, OUTPUT, OUTPUT);
    // Draw exactly as previewed: viewport center, then pan, turn and scale.
    context.translate(OUTPUT / 2, OUTPUT / 2);
    context.scale(OUTPUT / VIEWPORT, OUTPUT / VIEWPORT);
    context.translate(pan.x, pan.y);
    context.rotate(radians(rotation));
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      source.image,
      (-source.width * scale) / 2,
      (-source.height * scale) / 2,
      source.width * scale,
      source.height * scale,
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

  const scale = source ? photoScale(source, rotation, zoom) : 1;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto p-4">
      <button
        type="button"
        className="ui-backdrop absolute inset-0 bg-emerald-950/45 backdrop-blur-[2px]"
        aria-label="Đóng hộp cắt ảnh"
        onClick={onCancel}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-cropper-title"
        className="ui-dialog relative w-full max-w-md rounded-3xl border border-amber-900/15 bg-[#fffdf8] p-5 shadow-2xl sm:p-6"
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
          Kéo ảnh để chỉnh vị trí, phóng to để chọn khung và xoay nếu ảnh bị nghiêng.
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
              className="pointer-events-none absolute max-w-none select-none"
              style={{
                width: source.width * scale,
                height: source.height * scale,
                left: VIEWPORT / 2 + pan.x - (source.width * scale) / 2,
                top: VIEWPORT / 2 + pan.y - (source.height * scale) / 2,
                transform: `rotate(${rotation}deg)`,
              }}
            />
          ) : (
            <span className="grid size-full place-items-center text-sm text-stone-500">
              Đang mở ảnh…
            </span>
          )}
          {tilt !== 0 ? (
            // A grid to line up horizons and shoulders while straightening.
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.35)_1px,transparent_1px)] bg-size-[33.333%_33.333%]"
            />
          ) : null}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/70"
          />
        </div>

        <div className="mt-4 grid gap-3">
          <div className="flex items-center gap-3">
            <RoundButton
              label="Thu nhỏ"
              disabled={!source || zoom <= MIN_ZOOM}
              onClick={() => changeZoom(zoom - ZOOM_STEP)}
            >
              <Minus className="size-4" aria-hidden="true" />
            </RoundButton>
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
            <RoundButton
              label="Phóng to"
              disabled={!source || zoom >= MAX_ZOOM}
              onClick={() => changeZoom(zoom + ZOOM_STEP)}
            >
              <Plus className="size-4" aria-hidden="true" />
            </RoundButton>
          </div>

          <div className="flex items-center gap-3">
            <RoundButton
              label="Xoay trái 90°"
              disabled={!source}
              onClick={() => changeRotation(quarterTurns - 1, tilt)}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </RoundButton>
            <label className="grid min-w-0 flex-1 gap-1">
              <span className="flex items-center justify-between text-xs text-stone-500">
                <span>Xoay thẳng ảnh</span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums font-medium text-stone-700">
                    {tilt > 0 ? '+' : ''}
                    {tilt}°
                  </span>
                  {tilt !== 0 ? (
                    <button
                      type="button"
                      className="font-medium text-emerald-800 hover:underline"
                      onClick={() => changeRotation(quarterTurns, 0)}
                    >
                      Đặt lại
                    </button>
                  ) : null}
                </span>
              </span>
              <input
                type="range"
                min={-MAX_TILT}
                max={MAX_TILT}
                step={0.5}
                value={tilt}
                disabled={!source}
                aria-label="Góc xoay thẳng ảnh"
                className="h-1.5 min-w-0 accent-emerald-700"
                onChange={(event) =>
                  changeRotation(quarterTurns, Number(event.currentTarget.value))
                }
              />
            </label>
            <RoundButton
              label="Xoay phải 90°"
              disabled={!source}
              onClick={() => changeRotation(quarterTurns + 1, tilt)}
            >
              <RotateCw className="size-4" aria-hidden="true" />
            </RoundButton>
          </div>
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
