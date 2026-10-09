'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type Phase = 'idle' | 'loading' | 'done';

/** A link this tab follows to another page of the app, rather than a hash, a new tab or a download. */
function isPageLink(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const anchor = (event.target as Element | null)?.closest('a');
  if (!anchor?.href || anchor.hasAttribute('download')) return false;
  if (anchor.target && anchor.target !== '_self') return false;
  const next = new URL(anchor.href, window.location.href);
  if (next.origin !== window.location.origin) return false;
  return next.pathname !== window.location.pathname || next.search !== window.location.search;
}

/**
 * A thin gold bar across the top from the moment a link is followed until the
 * next page is in, so a slow server never leaves a tap looking ignored.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    // Bubble phase: a link whose click handler cancelled it (e.g. "unsaved
    // changes") has defaultPrevented set by now and starts nothing.
    const onClick = (event: MouseEvent): void => {
      if (isPageLink(event)) setPhase('loading');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    setPhase((current) => (current === 'loading' ? 'done' : current));
  }, [pathname]);

  useEffect(() => {
    if (phase === 'idle') return;
    // Finish the sweep then hide; give up quietly if a navigation never lands.
    const timer = window.setTimeout(() => setPhase('idle'), phase === 'done' ? 450 : 15000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === 'idle') return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] print:hidden"
      role="progressbar"
      aria-label="Đang chuyển trang"
    >
      <div
        className="h-full origin-left bg-[linear-gradient(90deg,#9a6b2f,#e8c56b,#7a1c1c,#e8c56b,#9a6b2f)] bg-[length:200%_100%] shadow-[0_0_8px_rgba(232,197,107,0.7)] transition-[transform,opacity] duration-300"
        style={
          phase === 'loading'
            ? {
                animation:
                  'heritage-progress 6s cubic-bezier(0.1, 0.7, 0.2, 1) forwards, heritage-shimmer 1.6s linear infinite',
              }
            : { transform: 'scaleX(1)', opacity: 0 }
        }
      />
    </div>
  );
}
