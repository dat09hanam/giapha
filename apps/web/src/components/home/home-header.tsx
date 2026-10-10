import Link from 'next/link';

import { LogoMark } from '@/components/layout/logo-mark';
import { SITE_BRAND } from '@/lib/site-brand';

import { HomeHeaderMenu } from './home-header-menu';
import { PublicBottomNav } from './public-bottom-nav';
import styles from './home.module.css';

export function HomeHeader({ onHomePage = true }: { onHomePage?: boolean }) {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerBar}>
          <Link href="/" className={styles.brand} aria-label={`${SITE_BRAND.name} — Trang chủ`}>
            <span className={styles.brandSeal}>
              <LogoMark className={styles.logoMark} />
            </span>
            <span className={styles.brandText}>
              <strong>
                {SITE_BRAND.nameLead} <em>{SITE_BRAND.nameAccent}</em>
              </strong>
              <small>{SITE_BRAND.tagline}</small>
            </span>
          </Link>
          <HomeHeaderMenu onHomePage={onHomePage} />
        </div>
      </header>
      <PublicBottomNav />
    </>
  );
}
