import Image from 'next/image';
import Link from 'next/link';

import { HomeHeaderMenu } from './home-header-menu';
import { PublicBottomNav } from './public-bottom-nav';
import styles from './home.module.css';

/** The brand mark: the logo's tree, sun and open book, cropped to fit a round seal. */
export function LogoMark() {
  return (
    <Image
      className={styles.logoMark}
      src="/images/decorations/logo-mark.webp"
      alt=""
      aria-hidden="true"
      width={384}
      height={384}
      sizes="64px"
    />
  );
}

/**
 * The public site's masthead: a parchment scroll with the brand and the menu, plus the tab bar
 * at the foot of the screen on phones and tablets. The public pages share it; `onHomePage`
 * decides whether section links stay on the page.
 */
export function HomeHeader({ onHomePage = true }: { onHomePage?: boolean }) {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerBar}>
          <Link href="/" className={styles.brand} aria-label="Gia Phả Đời Đời — Trang chủ">
            <span className={styles.brandSeal}>
              <LogoMark />
            </span>
            <span className={styles.brandText}>
              <strong>
                Gia Phả <em>Đời Đời</em>
              </strong>
              <small>Kết nối cội nguồn</small>
            </span>
          </Link>
          <HomeHeaderMenu onHomePage={onHomePage} />
        </div>
      </header>
      <PublicBottomNav />
    </>
  );
}
