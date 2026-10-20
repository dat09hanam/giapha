'use client';

import { useEffect } from 'react';

// Dialogs can stack (a confirm over a sheet), so the page stays locked until the last one closes.
let locks = 0;
let restore: (() => void) | null = null;

function lockPage(): void {
  locks += 1;
  if (locks > 1) return;
  const { documentElement: html, body } = document;
  const scrollY = window.scrollY;
  const scrollbar = window.innerWidth - html.clientWidth;
  const previous = {
    htmlOverflow: html.style.overflow,
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    paddingRight: body.style.paddingRight,
  };
  // Pinning the body is what stops touch scrolling on iOS Safari, where overflow alone does not.
  html.style.overflow = 'hidden';
  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  // The vanished scrollbar would otherwise shift the page sideways on desktop.
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
  restore = () => {
    html.style.overflow = previous.htmlOverflow;
    body.style.position = previous.position;
    body.style.top = previous.top;
    body.style.left = previous.left;
    body.style.right = previous.right;
    body.style.width = previous.width;
    body.style.paddingRight = previous.paddingRight;
    window.scrollTo({ top: scrollY, behavior: 'instant' });
  };
}

function unlockPage(): void {
  locks = Math.max(0, locks - 1);
  if (locks > 0 || !restore) return;
  restore();
  restore = null;
}

/**
 * Stops the page behind a modal dialog, sheet or full-screen viewer from scrolling or being
 * swiped while it is open. Call it in the component that is mounted only while open, or pass
 * whether the overlay is open.
 */
export function useBodyScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    lockPage();
    return unlockPage;
  }, [active]);
}
