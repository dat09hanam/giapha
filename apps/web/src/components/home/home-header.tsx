import Link from 'next/link';

import { LogoMark } from '@/components/layout/logo-mark';
import { SITE_BRAND } from '@/lib/site-brand';

import { HomeHeaderMenu } from './home-header-menu';
import { PublicBottomNav } from './public-bottom-nav';
import styles from './home.module.css';

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
