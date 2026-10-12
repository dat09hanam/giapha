'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Presence } from '@/components/ui/presence';
import type { PricingPlan } from '@/types/pricing';

import { PlanRegistrationDialog } from './plan-registration-dialog';
import { PricingCard } from './pricing-card';
import styles from './pricing.module.css';

export function PricingTable({ plans }: { plans: readonly PricingPlan[] }) {
  const [chosen, setChosen] = useState<PricingPlan | null>(null);
  const [inBrowser, setInBrowser] = useState(false);
  const [current, setCurrent] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => setInBrowser(true), []);

  // On phones the grid is a swipeable row: the card crossing the centre band is the current one.
  // The desktop grid shows every card at once, so the marker has no styling effect there.
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

  return (
    <>
      <div ref={gridRef} className={styles.grid}>
        {plans.map((plan) => (
          <PricingCard key={plan.id} plan={plan} onChoose={() => setChosen(plan)} />
        ))}
      </div>
      {plans.length > 1 ? (
        <div className={styles.dots}>
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
