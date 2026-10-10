'use client';

import { useSyncExternalStore } from 'react';

import { readViewerName, saveViewerName } from '@/lib/viewer-identity';

export { isViewerNameFixed } from '@/lib/viewer-identity';

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useViewerName(): string {
  return useSyncExternalStore(subscribe, readViewerName, () => '');
}

export function setViewerName(name: string): void {
  saveViewerName(name);
  listeners.forEach((listener) => listener());
}
