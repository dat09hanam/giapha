'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, Phone, UserRound, X } from 'lucide-react';

import styles from './home.module.css';

type Notice = 'Facebook' | 'Zalo' | 'Phone' | 'Bảng giá' | 'Tin tức' | 'Liên hệ';

export function HomeHeaderMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [notice, setNotice] = useState<Notice>('Liên hệ');

  function showNotice(title: Notice): void {
    setNotice(title);
    dialogRef.current?.showModal();
  }

  return (
    <div className={styles.navigation} data-open={menuOpen}>
      <div className={styles.mobileToolbar}>
        <Link href="/login" className={styles.loginAction}>Đăng nhập</Link>
        <button type="button" className={styles.menuToggle} aria-expanded={menuOpen}
          aria-controls="home-navigation" aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <div id="home-navigation" className={styles.menuContent}>
      <div className={styles.headerActions} aria-label="Liên hệ và tài khoản">
        <button
          type="button"
          className={styles.contactAction}
          onClick={() => showNotice('Facebook')}
        >
          <svg className={styles.socialIcon} viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="16" fill="#1877f2" />
            <path
              fill="white"
              d="M18 30V18h4l.6-5H18v-2.5c0-1.4.5-2.5 2.7-2.5H23V3.5c-.8-.1-2-.3-3.5-.3-4 0-6.5 2.4-6.5 6.7V13H9v5h4v12Z"
            />
          </svg>
          Facebook
        </button>
        <button type="button" className={styles.contactAction} onClick={() => showNotice('Zalo')}>
          <span className={styles.zaloIcon} aria-hidden="true">
            Zalo
          </span>
          Zalo
        </button>
        <button type="button" className={styles.contactAction} onClick={() => showNotice('Phone')}>
          <span className={styles.phoneIcon}>
            <Phone size={18} fill="currentColor" aria-hidden="true" />
          </span>
          Phone
        </button>
        <Link href="/login" className={styles.loginAction}>
          <UserRound size={24} fill="currentColor" aria-hidden="true" />
          Đăng nhập
        </Link>
      </div>
      <nav aria-label="Điều hướng chính">
        <a href="#top" aria-current="page">
          Trang chủ
        </a>
        <a href="#tinh-nang">Tính năng</a>
        <button type="button" onClick={() => showNotice('Bảng giá')}>
          Bảng giá
        </button>
        <button type="button" onClick={() => showNotice('Tin tức')}>
          Tin tức
        </button>
        <a href="#huong-dan">Hướng dẫn</a>
        <a href="#cau-hoi">Câu hỏi</a>
        <button type="button" onClick={() => showNotice('Liên hệ')}>
          Liên hệ
        </button>
      </nav>
      </div>
      <dialog
        ref={dialogRef}
        className={styles.menuDialog}
        aria-labelledby="menu-dialog-title"
        aria-describedby="menu-dialog-description"
      >
        <div className={styles.dialogHeading}>
          <h2 id="menu-dialog-title">{notice}</h2>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => dialogRef.current?.close()}
          >
            <X size={22} />
          </button>
        </div>
        <p id="menu-dialog-description">Chức năng đang phát triển</p>
        <form method="dialog">
          <button className={styles.dialogClose}>Đóng</button>
        </form>
      </dialog>
    </div>
  );
}
