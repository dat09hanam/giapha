'use client';

import { useEffect } from 'react';

/** Stops the page behind a modal dialog from scrolling while the dialog is mounted. */
export function useBodyScrollLock(): void {
  useEffect(() => {
    const { documentElement: html, body } = document;
    const previous = { html: html.style.overflow, body: body.style.overflow };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = previous.html;
      body.style.overflow = previous.body;
    };
  }, []);
}
