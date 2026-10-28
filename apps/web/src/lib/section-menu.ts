'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

export type SectionMenuItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
};

/** Sections of the current page that the mobile "Menu" sheet lists instead of an on-page tab bar. */
export type SectionMenu = {
  title: string;
  items: readonly SectionMenuItem[];
  activeId: string;
  open: (id: string) => void;
};

let current: SectionMenu | null = null;
const listeners = new Set<() => void>();

export function setSectionMenu(menu: SectionMenu | null): void {
  current = menu;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSectionMenu(): SectionMenu | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
