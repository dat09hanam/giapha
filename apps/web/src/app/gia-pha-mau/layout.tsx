import type { ReactNode } from 'react';

import { HomeHeader } from '@/components/home/home-header';

/** Gia phả mẫu is part of the public site, so it keeps the home page's masthead. */
export default function DemoFamilyLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <HomeHeader onHomePage={false} />
      {children}
    </>
  );
}
