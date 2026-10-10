'use client';

import { ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { cn } from '@/lib/utils';

const MAX_SCALE = 5;
const STEP_SCALE = 2.5;
const SWIPE_DISTANCE = 50;
const DOUBLE_TAP_MS = 300;

type View = { scale: number; x: number; y: number };
type Point = { x: number; y: number };

const FITTED: View = { scale: 1, x: 0, y: 0 };

export function ZoomableImage({
  src,
  alt,
  onSwipe,
  className,
}: {
  src: string;
  alt: string;
  onSwipe?: (direction: 1 | -1) => void;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [view, setView] = useState<View>(FITTED);
  const viewRef = useRef<View>(FITTED);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ view: View; mid: Point; distance: number; moved: boolean } | null>(null);
  const lastTap = useRef<{ time: number; point: Point } | null>(null);
  const lastPointerType = useRef('mouse');
  const [tracking, setTracking] = useState(false);
  const zoomed = view.scale > 1.01;

  function fromCentre(clientX: number, clientY: number): Point {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return { x: clientX - box.left - box.width / 2, y: clientY - box.top - box.height / 2 };
  }

  function clamp(next: View): View {
    const box = boxRef.current;
    const image = imageRef.current;
    if (!box || !image || next.scale <= 1) return FITTED;
    const scale = Math.min(next.scale, MAX_SCALE);
    const maxX = Math.max(0, (image.offsetWidth * scale - box.clientWidth) / 2);
    const maxY = Math.max(0, (image.offsetHeight * scale - box.clientHeight) / 2);
    return {
      scale,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function apply(next: View): void {
    const clamped = clamp(next);
    viewRef.current = clamped;
    setView(clamped);
  }

  function zoomAround(from: View, scale: number, at: Point): View {
    const ratio = scale / from.scale;
    return { scale, x: at.x - (at.x - from.x) * ratio, y: at.y - (at.y - from.y) * ratio };
  }

  function toggleAt(at: Point): void {
    const current = viewRef.current;
    apply(current.scale > 1.01 ? FITTED : zoomAround(current, STEP_SCALE, at));
  }

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const current = viewRef.current;
      const scale = Math.min(
        MAX_SCALE,
        Math.max(1, current.scale * Math.exp(-event.deltaY * 0.002)),
      );
      apply(zoomAround(current, scale, fromCentre(event.clientX, event.clientY)));
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, []);

  function startGesture(): void {
    const points = [...pointers.current.values()];
    const [a, b] = points;
    if (!a) {
      gesture.current = null;
      return;
    }
    const mid = b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a;
    const distance = b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    gesture.current = { view: viewRef.current, mid, distance, moved: false };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    event.currentTarget.setPointerCapture(event.pointerId);
    lastPointerType.current = event.pointerType;
    pointers.current.set(event.pointerId, fromCentre(event.clientX, event.clientY));
    setTracking(true);
    startGesture();
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, fromCentre(event.clientX, event.clientY));
    const [a, b] = [...pointers.current.values()];
    const start = gesture.current;
    if (!a) return;

    if (b && start.distance > 0) {
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const scale = Math.min(
        MAX_SCALE,
        Math.max(1, (start.view.scale * Math.hypot(a.x - b.x, a.y - b.y)) / start.distance),
      );
      const ratio = scale / start.view.scale;
      start.moved = true;
      apply({
        scale,
        x: mid.x - (start.mid.x - start.view.x) * ratio,
        y: mid.y - (start.mid.y - start.view.y) * ratio,
      });
      return;
    }

    const dx = a.x - start.mid.x;
    const dy = a.y - start.mid.y;
    if (Math.hypot(dx, dy) > 6) start.moved = true;
    if (start.view.scale > 1.01)
      apply({ ...start.view, x: start.view.x + dx, y: start.view.y + dy });
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>): void {
    const point = pointers.current.get(event.pointerId);
    pointers.current.delete(event.pointerId);
    const start = gesture.current;
    const wasSingle = pointers.current.size === 0 && start?.distance === 0;

    if (wasSingle && start && point) {
      const dx = point.x - start.mid.x;
      const dy = point.y - start.mid.y;
      if (!start.moved) {
        const now = Date.now();
        const previous = lastTap.current;
        if (
          event.pointerType !== 'mouse' &&
          previous &&
          now - previous.time < DOUBLE_TAP_MS &&
          Math.hypot(point.x - previous.point.x, point.y - previous.point.y) < 30
        ) {
          lastTap.current = null;
          toggleAt(point);
        } else {
          lastTap.current = { time: now, point };
        }
      } else if (
        onSwipe &&
        start.view.scale <= 1.01 &&
        Math.abs(dx) > SWIPE_DISTANCE &&
        Math.abs(dx) > Math.abs(dy)
      ) {
        onSwipe(dx < 0 ? 1 : -1);
      }
    }
    startGesture();
    if (pointers.current.size === 0) setTracking(false);
  }

  return (
    <div
      ref={boxRef}
      className={cn(
        'relative flex size-full touch-none select-none items-center justify-center overflow-hidden',
        zoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(event) => {
        if (lastPointerType.current === 'mouse') toggleAt(fromCentre(event.clientX, event.clientY));
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        draggable={false}
        className={cn(
          'ui-dialog max-h-full max-w-full object-contain will-change-transform',
          !tracking && 'transition-transform duration-200 ease-out',
        )}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
      />
      <div className="absolute bottom-3 right-3 hidden gap-1 sm:flex">
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onClick={() =>
            apply(
              zoomAround(viewRef.current, Math.max(1, viewRef.current.scale / 1.5), { x: 0, y: 0 }),
            )
          }
          disabled={!zoomed}
          className="grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 disabled:opacity-40"
          aria-label="Thu nhỏ"
        >
          <ZoomOut className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onClick={() =>
            apply(
              zoomAround(viewRef.current, Math.min(MAX_SCALE, viewRef.current.scale * 1.5), {
                x: 0,
                y: 0,
              }),
            )
          }
          disabled={view.scale >= MAX_SCALE}
          className="grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 disabled:opacity-40"
          aria-label="Phóng to"
        >
          <ZoomIn className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
