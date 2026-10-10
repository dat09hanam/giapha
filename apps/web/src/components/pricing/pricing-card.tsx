import { Check, X } from 'lucide-react';

import { formatPlanPrice, pricingPlanIcon } from '@/lib/pricing-plans';
import { cn } from '@/lib/utils';
import type { PricingCardPlan } from '@/types/pricing';

import styles from './pricing.module.css';

export function PricingCard({ plan, onChoose }: { plan: PricingCardPlan; onChoose?: () => void }) {
  const Icon = pricingPlanIcon(plan.icon);
  return (
    <article className={cn(styles.card, plan.isFeatured && styles.featured)} data-tone={plan.tone}>
      {plan.badge ? <span className={styles.badge}>{plan.badge}</span> : null}
      <span className={styles.emblem} aria-hidden="true">
        <Icon size={28} strokeWidth={1.6} />
      </span>
      <h3 className={styles.name}>{plan.name || 'Tên gói'}</h3>
      <p className={styles.price}>
        <strong>{formatPlanPrice(plan.price)}</strong>
        {plan.price > 0 && plan.billingPeriod ? <span>/{plan.billingPeriod}</span> : null}
      </p>
      {plan.description ? <p className={styles.description}>{plan.description}</p> : null}
      <ul className={styles.features}>
        {plan.features.map((feature, index) => {
          const excluded = feature.style === 'STRIKETHROUGH';
          return (
            <li
              key={`${index}-${feature.text}`}
              className={cn(feature.style === 'BOLD' && styles.bold, excluded && styles.excluded)}
            >
              {excluded ? (
                <X className={styles.mark} size={16} aria-hidden="true" />
              ) : (
                <Check className={styles.mark} size={16} aria-hidden="true" />
              )}
              {excluded ? (
                <s>
                  <span className="sr-only">Không gồm: </span>
                  {feature.text}
                </s>
              ) : (
                <span>{feature.text}</span>
              )}
            </li>
          );
        })}
      </ul>
      {onChoose ? (
        <button type="button" className={styles.cta} onClick={onChoose}>
          {plan.ctaLabel.trim() || 'Đăng ký ngay'}
        </button>
      ) : (
        <span className={styles.cta}>{plan.ctaLabel.trim() || 'Đăng ký ngay'}</span>
      )}
    </article>
  );
}
