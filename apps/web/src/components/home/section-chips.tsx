'use client';

import { useEffect, useRef, useState } from 'react';

import styles from './home.module.css';

type Section = { href: `#${string}`; label: string };

/** Sticky, horizontally scrolling jump links that follow the section in view (mobile only). */
export function SectionChips({ sections }: { sections: readonly Section[] }) {
  const [current, setCurrent] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targets = sections
      .map(({ href }) => document.getElementById(href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setCurrent(`#${visible.target.id}`);
      },
      { rootMargin: '-140px 0px -55% 0px' },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const list = listRef.current;
    const chip = list?.querySelector<HTMLElement>('[aria-current]');
    if (!list || !chip) return;
    list.scrollTo({
      left: chip.offsetLeft - (list.clientWidth - chip.offsetWidth) / 2,
      behavior: 'smooth',
    });
  }, [current]);

  return (
    <nav className={styles.sectionChips} aria-label="Đi tới mục">
      <div ref={listRef}>
        {sections.map(({ href, label }) => (
          <a key={href} href={href} aria-current={current === href ? 'location' : undefined}>
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
