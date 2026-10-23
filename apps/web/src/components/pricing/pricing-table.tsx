'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { Presence } from '@/components/ui/presence';
import { GOOGLE_CLIENT_ID, GOOGLE_SIGNUP_PATH } from '@/lib/auth-api';
import type { PricingPlan } from '@/types/pricing';

import { PlanCarousel } from './plan-carousel';
import { PlanRegistrationDialog } from './plan-registration-dialog';
import { PricingCard } from './pricing-card';

export function PricingTable({ plans }: { plans: readonly PricingPlan[] }) {
  const router = useRouter();
  // The plan the admin marked for Google sign-up is opened by the visitor themselves; the others
  // go through a registration request the admin follows up.
  const selfServicePlanId = GOOGLE_CLIENT_ID
    ? plans.find((plan) => plan.googleSignup)?.id
    : undefined;
  const [chosen, setChosen] = useState<PricingPlan | null>(null);
  const [inBrowser, setInBrowser] = useState(false);
  useEffect(() => setInBrowser(true), []);

  return (
    <>
      <PlanCarousel names={plans.map((plan) => plan.name)}>
        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            onChoose={() =>
              plan.id === selfServicePlanId ? router.push(GOOGLE_SIGNUP_PATH) : setChosen(plan)
            }
          />
        ))}
      </PlanCarousel>
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
