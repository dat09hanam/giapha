import Link from 'next/link';

import { HomeHeaderMenu } from './home-header-menu';
import styles from './home.module.css';

/** The brand mark: an old tree inside a cloud-scroll frame. */
export function LogoMark() {
  return (
    <svg className={styles.logoMark} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        d="M24 4c5 0 7 3 8 5 4-1 8 2 8 6 3 1 5 4 4 8 2 3 1 8-3 9 0 5-4 8-9 7-2 3-5 4-8 4s-6-1-8-4c-5 1-9-2-9-7-4-1-5-6-3-9-1-4 1-7 4-8 0-4 4-7 8-6 1-2 3-5 8-5Z"
      />
      <g fill="currentColor">
        <path d="M22.6 39V28.5c-2.8-.4-5.2-2-6.4-4.4 2.6.7 5 .5 6.4-.6v-3.4c-2 .8-4.6.6-6.5-.8 2.2-.6 4.4-1.6 5.6-3.3-1.5-.7-2.6-2-3-3.6 2 .8 4 .8 5.3.1 1.3.7 3.3.7 5.3-.1-.4 1.6-1.5 2.9-3 3.6 1.2 1.7 3.4 2.7 5.6 3.3-1.9 1.4-4.5 1.6-6.5.8v3.4c1.4 1.1 3.8 1.3 6.4.6-1.2 2.4-3.6 4-6.4 4.4V39Z" />
        <path d="M15 39.5h18v1.6H15Z" />
      </g>
    </svg>
  );
}

/**
 * The public site's masthead: a parchment scroll with the brand and the menu. The home page and
 * Gia phả mẫu share it; `onHomePage` decides whether section links stay on the page.
 */
export function HomeHeader({ onHomePage = true }: { onHomePage?: boolean }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerBar}>
        <Link href="/" className={styles.brand} aria-label="Gia phả Việt — Trang chủ">
          <span className={styles.brandSeal}>
            <LogoMark />
          </span>
          <span className={styles.brandText}>
            <strong>
              Gia phả <em>Việt</em>
            </strong>
            <small>Kết nối cội nguồn</small>
          </span>
        </Link>
        <HomeHeaderMenu onHomePage={onHomePage} />
      </div>
    </header>
  );
}
