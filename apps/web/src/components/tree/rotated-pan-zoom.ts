'use client';

import { useCallback, useRef, useSyncExternalStore, type MouseEvent, type TouchEvent } from 'react';
import { useReactFlow, useStoreApi, type Viewport, type XYPosition } from '@xyflow/react';

type Rect = { x: number; y: number; width: number; height: number };

const PORTRAIT_QUERY = '(orientation: portrait)';
/** Finger travel, in screen pixels, past which a touch is a drag rather than a tap. */
const TAP_SLOP = 8;

function subscribePortrait(onChange: () => void): () => void {
  const query = window.matchMedia(PORTRAIT_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Whether the screen is upright; false on the server. */
export function useIsPortrait(): boolean {
  return useSyncExternalStore(
    subscribePortrait,
    () => window.matchMedia(PORTRAIT_QUERY).matches,
    () => false,
  );
}

/**
 * Touch points in the surface's own coordinates. The surface is turned 90°
 * clockwise, so its x axis runs down the screen and its y axis right to left;
 * its top-left corner lands on the top-right of its on-screen box.
 */
function localPoints(event: TouchEvent<HTMLElement>): XYPosition[] {
  const rect = event.currentTarget.getBoundingClientRect();
  return Array.from(event.touches, (touch) => ({
    x: touch.clientY - rect.top,
    y: rect.right - touch.clientX,
  }));
}

function midpoint(a: XYPosition, b: XYPosition): XYPosition {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Keeps the sheet covering the canvas, or centred along an axis where it is smaller. */
function clampToPoster(viewport: Viewport, poster: Rect, width: number, height: number): Viewport {
  const clampAxis = (offset: number, start: number, size: number, canvas: number): number => {
    const scaled = size * viewport.zoom;
    if (scaled <= canvas) return (canvas - scaled) / 2 - start * viewport.zoom;
    return Math.min(
      -start * viewport.zoom,
      Math.max(canvas - (start + size) * viewport.zoom, offset),
    );
  };
  return {
    x: clampAxis(viewport.x, poster.x, poster.width, width),
    y: clampAxis(viewport.y, poster.y, poster.height, height),
    zoom: viewport.zoom,
  };
}

/**
 * Pan and pinch-zoom for a canvas shown turned sideways with CSS. React Flow
 * reads touches in screen axes, which a rotation scrambles, so while `enabled`
 * its own panning is switched off and these handlers drive the viewport.
 * Spread the returned handlers onto the element wrapping <ReactFlow>.
 */
export function useRotatedPanZoom(enabled: boolean, poster: Rect | null) {
  const { getViewport, setViewport } = useReactFlow();
  const store = useStoreApi();
  const gesture = useRef<{ points: XYPosition[]; viewport: Viewport } | null>(null);
  const dragged = useRef(false);

  const begin = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const points = localPoints(event);
      gesture.current = points.length > 0 ? { points, viewport: getViewport() } : null;
    },
    [getViewport],
  );

  const onTouchStart = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (!enabled) return;
      if (event.touches.length === 1) dragged.current = false;
      begin(event);
    },
    [begin, enabled],
  );

  const onTouchMove = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const start = gesture.current;
      if (!enabled || !start || !poster) return;
      const points = localPoints(event);
      // A finger was added or lifted: carry on from here.
      if (points.length !== start.points.length) {
        begin(event);
        return;
      }

      const { maxZoom } = store.getState();
      const { offsetWidth: width, offsetHeight: height } = event.currentTarget;
      const from = start.viewport;
      let next: Viewport;
      if (points.length === 1) {
        const dx = points[0]!.x - start.points[0]!.x;
        const dy = points[0]!.y - start.points[0]!.y;
        if (Math.hypot(dx, dy) > TAP_SLOP) dragged.current = true;
        next = { x: from.x + dx, y: from.y + dy, zoom: from.zoom };
      } else {
        dragged.current = true;
        const [a0, b0] = start.points as [XYPosition, XYPosition];
        const [a, b] = points as [XYPosition, XYPosition];
        // Never smaller than the whole sheet fitted to the canvas.
        const minZoom = Math.min(width / poster.width, height / poster.height);
        const scale =
          Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, Math.hypot(a0.x - b0.x, a0.y - b0.y));
        const zoom = Math.min(maxZoom, Math.max(minZoom, from.zoom * scale));
        // The canvas point under the fingers' midpoint stays under it.
        const startMid = midpoint(a0, b0);
        const mid = midpoint(a, b);
        next = {
          x: mid.x - ((startMid.x - from.x) / from.zoom) * zoom,
          y: mid.y - ((startMid.y - from.y) / from.zoom) * zoom,
          zoom,
        };
      }
      void setViewport(clampToPoster(next, poster, width, height));
    },
    [begin, enabled, poster, setViewport, store],
  );

  const onTouchEnd = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (enabled) begin(event);
    },
    [begin, enabled],
  );

  /** A drag that ends over a card must not open it. */
  const onClickCapture = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (!enabled || !dragged.current) return;
      dragged.current = false;
      event.stopPropagation();
      event.preventDefault();
    },
    [enabled],
  );

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd, onClickCapture };
}
