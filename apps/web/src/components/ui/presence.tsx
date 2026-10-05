'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** A little longer than the exit animations in globals.css (`ui-*`), so they finish. */
export const PRESENCE_EXIT_MS = 220;

/**
 * Whether something that is closing should stay mounted a moment longer, so
 * its exit animation can play. `state` goes on a `data-presence` attribute,
 * which the `ui-*` animation classes in globals.css read.
 */
export function usePresence(open: boolean): { mounted: boolean; state: 'open' | 'closed' } {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), PRESENCE_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  return { mounted: open || mounted, state: open ? 'open' : 'closed' };
}

/**
 * Animates a modal in and out. Render the modal as a child when it is open and
 * nothing when it is closed, exactly as without this wrapper: the last child is
 * kept on screen while it animates out. Give the modal's backdrop `ui-backdrop`
 * and its panel `ui-dialog`, `ui-sheet` or `ui-sheet-dialog`.
 */
export function Presence({ children }: { children: ReactNode }) {
  const open = Boolean(children);
  const lastChildren = useRef(children);
  if (open) lastChildren.current = children;
  const { mounted, state } = usePresence(open);

  if (!mounted) return null;
  return (
    // `contents` leaves the modal's own fixed positioning untouched; a closing
    // modal ignores taps (pointer-events is inherited).
    <div data-presence={state} className="contents data-[presence=closed]:pointer-events-none">
      {open ? children : lastChildren.current}
    </div>
  );
}
