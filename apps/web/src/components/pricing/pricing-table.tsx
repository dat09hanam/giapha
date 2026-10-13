'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Presence } from '@/components/ui/presence';
import { cn } from '@/lib/utils';
import type { PricingPlan } from '@/types/pricing';

import { PlanRegistrationDialog } from './plan-registration-dialog';
import { PricingCard } from './pricing-card';
import styles from './pricing.module.css';

export function PricingTable({ plans }: { plans: readonly PricingPlan[] }) {
  const [chosen, setChosen] = useState<PricingPlan | null>(null);
  const [inBrowser, setInBrowser] = useState(false);
  const [current, setCurrent] = useState(0);
  const [edges, setEdges] = useState({ start: false, end: false });
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => setInBrowser(true), []);

  // Whether cards are hidden past either edge of the row, which drives the arrows and dots.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const update = (): void => {
      const start = grid.scrollLeft > 4;
      const end = grid.scrollLeft + grid.clientWidth < grid.scrollWidth - 4;
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    update();
    grid.addEventListener('scroll', update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(grid);
    return () => {
      grid.removeEventListener('scroll', update);
      resize.disconnect();
    };
  }, [plans]);

  // The row scrolls sideways: the card crossing the centre band is the current one. Only the
  // phone layout styles it, but the dots follow it on every screen.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const cards = Array.from(grid.children) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (hit) setCurrent(cards.indexOf(hit.target as HTMLElement));
      },
      { root: grid, rootMargin: '0px -45% 0px -45%' },
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [plans]);

  useEffect(() => {
    const cards = gridRef.current?.children;
    if (!cards) return;
    Array.from(cards).forEach((card, index) => card.toggleAttribute('data-current', index === current));
  }, [current, plans]);

  function scrollByCard(direction: 1 | -1): void {
    const grid = gridRef.current;
    const card = grid?.firstElementChild as HTMLElement | null | undefined;
    if (!grid || !card) return;
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    grid.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: 'smooth' });
  }

  return (
    <>
      <div className={styles.carousel}>
        <div ref={gridRef} className={styles.grid}>
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} onChoose={() => setChosen(plan)} />
          ))}
        </div>
        {edges.start ? (
          <button
            type="button"
            className={cn(styles.arrow, styles.arrowPrev)}
            aria-label="Xem các gói trước"
            onClick={() => scrollByCard(-1)}
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
        ) : null}
        {edges.end ? (
          <button
            type="button"
            className={cn(styles.arrow, styles.arrowNext)}
            aria-label="Xem các gói tiếp theo"
            onClick={() => scrollByCard(1)}
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        ) : null}
      </div>
      {plans.length > 1 ? (
        <div className={styles.dots} data-overflow={edges.start || edges.end || undefined}>
          {plans.map((plan, index) => (
            <button
              key={plan.id}
              type="button"
              aria-label={`Xem gói ${plan.name}`}
              aria-current={index === current || undefined}
              onClick={() =>
                gridRef.current?.children[index]?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'nearest',
                  inline: 'center',
                })
              }
            />
          ))}
        </div>
      ) : null}
      {inBrowser
        ? createPortal(
            <Presence>
              {chosen ? (
                <PlanRegistrationDialog plan={chosen} onClose={() => setChosen(null)} />
              ) : null}
            </Presence>,
            document.body,
          )
        : null}
    </>
  );
}
