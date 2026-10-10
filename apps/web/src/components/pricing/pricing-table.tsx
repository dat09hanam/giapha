'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { Presence } from '@/components/ui/presence';
import type { PricingPlan } from '@/types/pricing';

import { PlanRegistrationDialog } from './plan-registration-dialog';
import { PricingCard } from './pricing-card';
import styles from './pricing.module.css';

export function PricingTable({ plans }: { plans: readonly PricingPlan[] }) {
  const [chosen, setChosen] = useState<PricingPlan | null>(null);
  const [inBrowser, setInBrowser] = useState(false);
  useEffect(() => setInBrowser(true), []);

  return (
    <>
      <div className={styles.grid}>
        {plans.map((plan) => (
          <PricingCard key={plan.id} plan={plan} onChoose={() => setChosen(plan)} />
        ))}
      </div>
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
