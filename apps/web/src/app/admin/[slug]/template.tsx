import type { ReactNode } from 'react';

/**
 * Remounts on every move between the family's sections, so each new page (and its
 * loading skeleton) eases in instead of snapping into place.
 */
export default function FamilySectionTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
