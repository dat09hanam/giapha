'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { featureGroups, features, type FeatureGroup } from './home-content';
import { PhoneFrame, PrintSheet } from './phone-frame';
import styles from './showcase.module.css';

type Filter = FeatureGroup | 'all';

export function FeatureShowcase() {
  const [filter, setFilter] = useState<Filter>('all');
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLUListElement>(null);
  const shown = filter === 'all' ? features : features.filter((f) => f.group === filter);

  const slideStep = useCallback((): number => {
    const track = trackRef.current;
    const first = track?.children[0] as HTMLElement | undefined;
    const second = track?.children[1] as HTMLElement | undefined;
    if (!first) return 1;
    return second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
  }, []);

  const goTo = useCallback(
    (index: number) => {
      trackRef.current?.scrollTo({ left: index * slideStep(), behavior: 'smooth' });
    },
    [slideStep],
  );

  const choose = (next: Filter) => {
    setFilter(next);
    setActive(0);
    trackRef.current?.scrollTo({ left: 0 });
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    setActive(atEnd ? shown.length - 1 : Math.round(track.scrollLeft / slideStep()));
  };

  const chips: readonly { id: Filter; label: string }[] = [
    { id: 'all', label: `Tất cả (${features.length})` },
    ...featureGroups,
  ];

  return (
    <div className={styles.showcase}>
      <div className={styles.chips} role="group" aria-label="Lọc chức năng">
        {chips.map(({ id, label }) => (
          <button key={id} type="button" aria-pressed={filter === id} onClick={() => choose(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className={styles.trackWrap}>
        <ul ref={trackRef} className={styles.track} onScroll={onScroll}>
          {shown.map(({ icon: Icon, title, text, image, print }) => (
            <li key={title} className={styles.slide}>
              <div className={styles.slideArt}>
                {print ? (
                  <PrintSheet src={print} alt={`${title}: phả đồ dòng họ mẫu`} />
                ) : (
                  <PhoneFrame
                    src={image}
                    icon={Icon}
                    alt={image ? `${title}: màn hình trên điện thoại` : title}
                    sizes="(max-width: 640px) 70vw, 240px"
                  />
                )}
              </div>
              <div className={styles.slideCaption}>
                <span className={styles.slideIcon}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={cn(styles.arrow, styles.arrowPrev)}
          onClick={() => goTo(Math.max(0, active - 1))}
          disabled={active === 0}
          aria-label="Chức năng trước"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={cn(styles.arrow, styles.arrowNext)}
          onClick={() => goTo(Math.min(shown.length - 1, active + 1))}
          disabled={active >= shown.length - 1}
          aria-label="Chức năng tiếp theo"
        >
          <ChevronRight size={22} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.dots}>
        {shown.map(({ title }, index) => (
          <button
            key={title}
            type="button"
            aria-label={`Xem ${title}`}
            aria-current={index === active ? 'true' : undefined}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </div>
  );
}
