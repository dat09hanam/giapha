import type { ReactNode } from 'react';

import { HomeFooter } from '@/components/home/home-footer';
import { HomeHeader } from '@/components/home/home-header';

export default function ArticlesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <HomeHeader onHomePage={false} />
      {children}
      <HomeFooter />
    </>
  );
}
