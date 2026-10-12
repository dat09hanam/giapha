'use client';

import { ArrowRight, PhoneCall } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { ContactLink } from '@/components/social/contact-link';
import { cn } from '@/lib/utils';

import { featureGroups, features } from './home-content';
import { PhoneFrame, PrintSheet } from './phone-frame';
import styles from './showcase.module.css';

/** How long each feature stays in the spotlight. */
const DWELL_MS = 5000;
/** Horizontal drag on the stage that counts as a swipe. */
const SWIPE_PX = 40;

const groupLabel = Object.fromEntries(featureGroups.map(({ id, label }) => [id, label]));
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Auto-playing feature tabs: a list on one side, one large phone on a stage on the
 * other. The active tab's bar fills while it is shown, then the next tab takes over.
 */
export function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  const visible = useRef(false);
  const swipeFrom = useRef<number | null>(null);

  const show = (index: number) => {
    elapsed.current = 0;
    setActive((index + features.length) % features.length);
  };

  // Drives the progress bar through a CSS variable so frames do not re-render React.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const delta = now - previous;
      previous = now;
      if (visible.current && !document.hidden) elapsed.current += delta;
      if (elapsed.current >= DWELL_MS) {
        elapsed.current = 0;
        setActive((current) => (current + 1) % features.length);
      }
      root.style.setProperty('--progress', String(elapsed.current / DWELL_MS));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const observer = new IntersectionObserver(([entry]) => {
      visible.current = Boolean(entry?.isIntersecting);
    });
    observer.observe(root);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  // Keep the active tab in view on the horizontal mobile strip without moving the page.
  useEffect(() => {
    const strip = tabsRef.current;
    const tab = strip?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!strip || !tab || strip.scrollWidth <= strip.clientWidth) return;
    const left = tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2;
    strip.scrollTo({ left, behavior: 'smooth' });
  }, [active]);

  const current = features[active]!;
  const CurrentIcon = current.icon;

  return (
    <div ref={rootRef} className={styles.showcase} style={{ '--progress': 0 } as CSSProperties}>
      <div
        ref={tabsRef}
        className={styles.tabs}
        role="tablist"
        aria-label="Chức năng"
        aria-orientation="vertical"
        onKeyDown={(e) => {
          const delta = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
          if (!delta) return;
          e.preventDefault();
          const next = (active + delta + features.length) % features.length;
          show(next);
          tabsRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
        }}
      >
        {features.map(({ icon: Icon, title, text, group }, index) => (
          <div key={title} className={styles.tabItem}>
            {features[index - 1]?.group !== group && (
              <span className={styles.groupLabel}>{groupLabel[group]}</span>
            )}
            <button
              type="button"
              role="tab"
              id={`feature-tab-${index}`}
              aria-selected={index === active}
              aria-controls="feature-stage"
              tabIndex={index === active ? 0 : -1}
              className={styles.tab}
              onClick={() => show(index)}
            >
              <span className={styles.tabIcon}>
                <Icon size={17} aria-hidden="true" />
              </span>
              <span className={styles.tabBody}>
                <span className={styles.tabTitle}>{title}</span>
                <span className={styles.tabText}>
                  <span>{text}</span>
                </span>
              </span>
              <span className={styles.tabProgress} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <div
        id="feature-stage"
        className={styles.stage}
        role="tabpanel"
        aria-labelledby={`feature-tab-${active}`}
        onPointerDown={(e) => {
          swipeFrom.current = e.clientX;
        }}
        onPointerUp={(e) => {
          const from = swipeFrom.current;
          swipeFrom.current = null;
          if (from === null || Math.abs(e.clientX - from) < SWIPE_PX) return;
          show(active + (e.clientX < from ? 1 : -1));
        }}
        onPointerCancel={() => {
          swipeFrom.current = null;
        }}
      >
        <p className={styles.counter} aria-hidden="true">
          <span key={active}>{pad(active + 1)}</span> / {pad(features.length)}
        </p>

        <div className={styles.device}>
          <span className={styles.glow} aria-hidden="true" />
          <span className={styles.scenery} aria-hidden="true" />

          <div className={styles.float}>
            {features.map(({ icon, title, image, print }, index) => (
              <div
                key={title}
                className={cn(styles.screenSlot, print && styles.screenSlotWide)}
                data-active={index === active || undefined}
                aria-hidden={index !== active}
              >
                {print ? (
                  <PrintSheet src={print} alt={`${title}: phả đồ dòng họ mẫu`} sizes="420px" />
                ) : (
                  <PhoneFrame
                    src={image}
                    icon={icon}
                    alt={image ? `${title}: màn hình trên điện thoại` : title}
                    sizes="(max-width: 900px) 62vw, 300px"
                  />
                )}
              </div>
            ))}

            <span key={active} className={styles.badge} aria-hidden="true">
              <CurrentIcon size={16} />
              {groupLabel[current.group]}
            </span>
          </div>
        </div>

        <div className={styles.caption}>
          <h3 key={active}>{current.title}</h3>
          <p>{current.text}</p>
        </div>
      </div>

      <aside className={styles.cta} aria-label="Xem gia phả mẫu">
        <p className={styles.ctaTitle}>Xem tận mắt trước khi bắt đầu</p>
        <p className={styles.ctaText}>Gia phả mẫu mở ngay trên điện thoại, không cần đăng nhập.</p>
        <div className={styles.ctaActions}>
          <Link className={styles.ctaPrimary} href="/gia-pha-mau">
            Xem gia phả mẫu <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <ContactLink className={styles.ctaSecondary}>
            <PhoneCall size={15} aria-hidden="true" /> Đăng ký cho dòng họ
          </ContactLink>
        </div>
      </aside>
    </div>
  );
}
