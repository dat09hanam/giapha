import type { ReactNode } from 'react';

export default function FamilySectionTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
