'use client';

import { House } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/ui/button';
import { getCurrentProfile } from '@/lib/auth-api';

export function SiteHeaderContent() {
  const pathname = usePathname();
  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/');
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdminArea) {
      setDisplayName(null);
      return;
    }

    let cancelled = false;

    void getCurrentProfile()
      .then((profile) => {
        if (!cancelled) setDisplayName(profile.displayName);
      })
      .catch(() => {
        if (!cancelled) setDisplayName(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdminArea]);

  if (isAdminArea) {
    return (
      <nav className="flex items-center gap-2 sm:gap-3" aria-label="Điều hướng quản trị">
        {displayName ? (
          <span
            className="hidden max-w-20 truncate text-sm font-medium text-brand-950 min-[420px]:inline sm:max-w-40"
            title={displayName}
          >
            {displayName}
          </span>
        ) : null}
        <Button asChild variant="ghost" aria-label="Trang chủ">
          <Link href="/">
            <House className="size-4" aria-hidden="true" />
            <span className="hidden min-[420px]:inline">Trang chủ</span>
          </Link>
        </Button>
        <LogoutButton compactOnMobile />
      </nav>
    );
  }

  return (
    <span className="hidden text-sm text-stone-500 sm:inline">Mỗi gia đình, một câu chuyện</span>
  );
}
