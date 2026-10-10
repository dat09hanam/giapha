import type { ReactNode } from 'react';

import { HomeHeader } from '@/components/home/home-header';

export default function DemoFamilyLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <HomeHeader onHomePage={false} />
      {children}
    </>
  );
}
