'use client';

import { useCallback, useRef, type RefObject } from 'react';
import type { Viewport } from '@xyflow/react';

/**
 * React Flow moves the tree by rewriting the viewport's CSS transform. Without its own
 * compositor layer, every frame of a pan or pinch repaints the whole poster and every card,
 * which phones cannot keep up with. The viewport is promoted while it moves so the GPU only
 * shifts an already painted layer, and demoted after a zoom change so the browser repaints it
 * sharply at the new scale. After a plain pan it stays promoted: nothing needs repainting.
 *
 * WebKit (Safari, and every browser on iOS) rasterises a composited layer at its own unzoomed
 * size rather than at the scale it is shown. The poster is far larger than the screen and is
 * shown zoomed far out, so a promoted viewport there paints hundreds of times more pixels than
 * the screen holds and pans and pinches stall. On WebKit the viewport is never promoted.
 */
function rastersAtShownScale(): boolean {
  return !('GestureEvent' in window);
}

export function useViewportLayer(surface: RefObject<HTMLElement | null>) {
  const layer = useRef({ promoted: false, zoom: 0, holding: false });

  const viewportElement = useCallback(
    (): HTMLElement | null =>
      surface.current?.querySelector<HTMLElement>('.react-flow__viewport') ?? null,
    [surface],
  );

  const onMoveStart = useCallback(
    (_event: unknown, viewport: Viewport) => {
      const element = viewportElement();
      if (!element || layer.current.promoted || !rastersAtShownScale()) return;
      element.style.willChange = 'transform';
      layer.current.promoted = true;
      layer.current.zoom = viewport.zoom;
    },
    [viewportElement],
  );

  const onMoveEnd = useCallback(
    (_event: unknown, viewport: Viewport) => {
      const state = layer.current;
      if (state.holding || !state.promoted || viewport.zoom === state.zoom) return;
      const element = viewportElement();
      if (element) element.style.willChange = '';
      state.promoted = false;
    },
    [viewportElement],
  );

  /** Keeps the layer promoted across the many short moves of a hand-driven gesture. */
  const hold = useCallback(
    (active: boolean, viewport: Viewport) => {
      if (active) {
        onMoveStart(null, viewport);
        layer.current.holding = true;
        return;
      }
      layer.current.holding = false;
      onMoveEnd(null, viewport);
    },
    [onMoveEnd, onMoveStart],
  );

  return { onMoveStart, onMoveEnd, hold };
}
