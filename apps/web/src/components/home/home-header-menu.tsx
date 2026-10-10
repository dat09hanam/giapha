'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Flame, House, LayoutGrid, Menu, Network, Tag, UserRound, X } from 'lucide-react';

import { ContactLink } from '@/components/social/contact-link';
import { RingingPhone } from '@/components/social/ringing-phone';

import styles from './home.module.css';

const LINKS = [
  { href: '#top', label: 'Trang chủ', icon: House },
  { href: '/gia-pha-mau', label: 'Gia phả mẫu', icon: Network },
  { href: '#chuc-nang', label: 'Chức năng', icon: LayoutGrid },
  { href: '/mau-bai-cung', label: 'Mẫu bài cúng', icon: Flame },
  { href: '/thu-vien', label: 'Thư viện', icon: BookOpen },
  { href: '#bang-gia', label: 'Bảng giá', icon: Tag },
] as const;

function linkHref(href: string, onHomePage: boolean): string {
  return href.startsWith('#') && !onHomePage ? `/${href}` : href;
}

export function HomeHeaderMenu({ onHomePage = true }: { onHomePage?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const [chosenSection, setChosenSection] = useState('#top');
  const current = onHomePage
    ? chosenSection
    : LINKS.find(
        ({ href }) =>
          !href.startsWith('#') && (pathname === href || pathname.startsWith(`${href}/`)),
      )?.href;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);

  return (
    <div className={styles.navigation} data-open={menuOpen}>
      <nav id="home-navigation" className={styles.navLinks} aria-label="Điều hướng chính">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <a
            key={href}
            href={linkHref(href, onHomePage)}
            aria-current={current === href ? 'location' : undefined}
            onClick={() => {
              setChosenSection(href);
              setMenuOpen(false);
            }}
          >
            <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
        <ContactLink href={linkHref('#lien-he', onHomePage)} onOpen={() => setMenuOpen(false)}>
          <RingingPhone size={22} strokeWidth={1.7} />
          <span>Tạo gia phả</span>
        </ContactLink>
      </nav>
      <div className={styles.headerActions}>
        <Link href="/login" className={styles.loginAction} aria-label="Đăng nhập">
          <UserRound size={18} aria-hidden="true" />
          <span className={styles.loginLabel}>Đăng nhập</span>
        </Link>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.menuToggle}`}
          aria-expanded={menuOpen}
          aria-controls="home-navigation"
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
