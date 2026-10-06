'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, Search, X } from 'lucide-react';

import styles from './home.module.css';

const LINKS = [
  { href: '#top', label: 'Trang chủ' },
  { href: '#gioi-thieu', label: 'Giới thiệu' },
  { href: '#y-nghia', label: 'Ý nghĩa' },
  { href: '#tinh-nang', label: 'Tính năng' },
  { href: '#hinh-anh', label: 'Hình ảnh' },
  { href: '#lien-he', label: 'Liên hệ' },
] as const;

export function HomeHeaderMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [current, setCurrent] = useState<string>('#top');
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
        {LINKS.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            aria-current={current === href ? 'location' : undefined}
            onClick={() => {
              setCurrent(href);
              setMenuOpen(false);
            }}
          >
            {label}
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
        <Link href="/login" className={styles.loginAction}>
          Đăng nhập
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
