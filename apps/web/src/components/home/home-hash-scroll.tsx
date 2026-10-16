'use client';

import { useEffect } from 'react';

/**
 * Scrolls to the URL's section (`/#chuc-nang`, `/#bang-gia`…) once the home page is on screen.
 * The page streams in behind the root loading screen, so when the browser looks for the anchor on
 * arrival it is not there yet and the browser never retries. Images above the section can still
 * shift it while they load, so it scrolls again on `load` unless the visitor has scrolled already.
 */
export function HomeHashScroll(): null {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const scroll = (): void => {
      document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    };
    const frame = window.requestAnimationFrame(scroll);
    if (document.readyState === 'complete') return () => window.cancelAnimationFrame(frame);

    const controller = new AbortController();
    const stop = (): void => controller.abort();
    window.addEventListener('load', () => (scroll(), stop()), { signal: controller.signal });
    for (const event of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) {
      window.addEventListener(event, stop, { signal: controller.signal, passive: true });
    }
    return () => {
      window.cancelAnimationFrame(frame);
      stop();
    };
  }, []);
  return null;
}
