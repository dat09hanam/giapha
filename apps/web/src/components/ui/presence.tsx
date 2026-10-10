'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export const PRESENCE_EXIT_MS = 220;

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

export function Presence({ children }: { children: ReactNode }) {
  const open = Boolean(children);
  const lastChildren = useRef(children);
  if (open) lastChildren.current = children;
  const { mounted, state } = usePresence(open);

  if (!mounted) return null;
  return (
    <div data-presence={state} className="contents data-[presence=closed]:pointer-events-none">
      {open ? children : lastChildren.current}
    </div>
  );
}
