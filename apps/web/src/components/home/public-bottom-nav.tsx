'use client';

import { BookOpen, Flame, House, Network } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { BottomTab } from '@/components/layout/family-header';
import { ContactLink } from '@/components/social/contact-link';
import { RingingPhone } from '@/components/social/ringing-phone';

import styles from './home.module.css';

const TABS = [
  { href: '/', label: 'Trang chủ', icon: House },
  { href: '/gia-pha-mau', label: 'Gia phả mẫu', icon: Network },
  { href: '/mau-bai-cung', label: 'Bài cúng', icon: Flame },
  { href: '/thu-vien', label: 'Thư viện', icon: BookOpen },
] as const;

export function PublicBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={`${styles.bottomNav} fixed inset-x-0 bottom-0 z-50 border-t border-gold-500/30 bg-paper/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(74,46,18,0.08)] backdrop-blur lg:hidden print:hidden`}
      aria-label="Điều hướng nhanh"
    >
      <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
        {TABS.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className="block h-full"
                onClick={(event) => {
                  if (href === '/' && pathname === '/') {
                    event.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              >
                <BottomTab icon={icon} label={label} active={active} />
              </Link>
            </li>
          );
        })}
        <li>
          <ContactLink className="block h-full">
            <BottomTab icon={RingingPhone} label="Liên hệ" />
          </ContactLink>
        </li>
      </ul>
    </nav>
  );
}
