import type { ReactNode } from 'react';

import { HomeFooter } from '@/components/home/home-footer';
import { HomeHeader } from '@/components/home/home-header';

/** Thư viện is part of the public site, so it keeps the home page's masthead and footer. */
export default function ArticlesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <HomeHeader onHomePage={false} />
      {children}
      <HomeFooter />
    </>
  );
}
