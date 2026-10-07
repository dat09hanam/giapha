'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CircleHelp,
  Flower2,
  House,
  Menu,
  Network,
  ScrollText,
  Search,
  UserRound,
  X,
} from 'lucide-react';

import styles from './home.module.css';

const LINKS = [
  { href: '#top', label: 'Trang chủ', icon: House },
  { href: '/gia-pha-mau', label: 'Gia phả mẫu', icon: Network },
  { href: '#gioi-thieu', label: 'Giới thiệu', icon: BookOpen },
  { href: '#cach-bat-dau', label: 'Cách bắt đầu', icon: ScrollText },
  { href: '#y-nghia', label: 'Ý nghĩa', icon: Flower2 },
  { href: '#hoi-dap', label: 'Hỏi đáp', icon: CircleHelp },
] as const;

const SAMPLE_PATH = '/gia-pha-mau';

/** Away from the home page, section links lead back to that section of it. */
function linkHref(href: string, onHomePage: boolean): string {
  return href.startsWith('#') && !onHomePage ? `/${href}` : href;
}

export function HomeHeaderMenu({ onHomePage = true }: { onHomePage?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [current, setCurrent] = useState<string>(onHomePage ? '#top' : SAMPLE_PATH);
  const dialogRef = useRef<HTMLDialogElement>(null);

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
              setCurrent(href);
              setMenuOpen(false);
            }}
          >
            <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <div className={styles.headerActions}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Tìm kiếm"
          onClick={() => dialogRef.current?.showModal()}
        >
          <Search size={18} aria-hidden="true" />
        </button>
        <span className={styles.actionDivider} aria-hidden="true" />
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
      <dialog
        ref={dialogRef}
        className={styles.menuDialog}
        aria-labelledby="search-dialog-title"
        aria-describedby="search-dialog-description"
      >
        <div className={styles.dialogHeading}>
          <h2 id="search-dialog-title">Tìm kiếm</h2>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => dialogRef.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <p id="search-dialog-description">Chức năng đang phát triển</p>
        <form method="dialog">
          <button className={styles.dialogClose}>Đóng</button>
        </form>
      </dialog>
    </div>
  );
}
