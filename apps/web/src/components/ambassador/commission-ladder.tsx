import { ArrowRight, Crown, Sparkles } from 'lucide-react';
import Image from 'next/image';
import type { CSSProperties } from 'react';

import { formatPlanPrice } from '@/lib/pricing-plans';
import { formatVnd } from '@/lib/vietnamese-number';
import { cn } from '@/lib/utils';

import { AmbassadorSignupButton } from './ambassador-signup';
import styles from './ambassador.module.css';

export type LadderPlan = {
  id: string;
  name: string;
  price: number;
  billingPeriod: string | null;
  commissionPercent: number;
  /** In đồng: the percent of the price. */
  commissionAmount: number;
};

/** Lowest card head, as a share of the tallest, so a small commission still reads as a step. */
const MIN_FILL = 0.2;

/** Line-drawn lotus closing the foot of each card. */
function LotusOutline() {
  return (
    <svg className={styles.cardLotus} viewBox="0 0 64 28" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
        <path d="M32 3c-4 5-4 13 0 19 4-6 4-14 0-19Z" />
        <path d="M32 22c-3-6-9-10-16-10 1 6 7 10 16 10Z" />
        <path d="M32 22c3-6 9-10 16-10-1 6-7 10-16 10Z" />
        <path d="M32 22c-6-3-14-3-22 0 6 3 14 3 22 0Z" />
        <path d="M32 22c6-3 14-3 22 0-6 3-14 3-22 0Z" />
        <path d="M8 26h48" />
      </g>
    </svg>
  );
}

/**
 * The commission per plan as a row of temple-gate cards rising left to right: each card's
 * green head grows with what it pays, and the best-paying plan is gilded.
 */
export function CommissionLadder({ plans }: { plans: readonly LadderPlan[] }) {
  const steps = [...plans].sort((a, b) => a.commissionAmount - b.commissionAmount);
  const richest = steps[steps.length - 1];
  if (!richest) return null;

  return (
    <div className={styles.ladderWrap}>
      <ol className={styles.ladder} style={{ '--steps': steps.length } as CSSProperties}>
        {steps.map((plan, index) => {
          const fill =
            MIN_FILL + (1 - MIN_FILL) * (plan.commissionAmount / richest.commissionAmount);
          const best = plan.id === richest.id;
          return (
            <li
              key={plan.id}
              className={cn(styles.card, best && styles.cardBest)}
              style={{ '--fill': fill, '--delay': `${index * 90}ms` } as CSSProperties}
            >
              <span className={styles.cardSeal}>
                {best ? <Crown size={18} aria-hidden="true" /> : null}
                <strong>{plan.commissionPercent}%</strong>
              </span>
              <span className={styles.cardHead}>
                <small>Bạn nhận</small>
                <strong>{formatVnd(plan.commissionAmount)}</strong>
                <span>mỗi gia phả</span>
              </span>
              <span className={styles.cardBase}>
                <Image
                  className={styles.cardMark}
                  src="/images/home/footer-lotus.webp"
                  alt=""
                  aria-hidden="true"
                  width={32}
                  height={29}
                />
                <span className={styles.cardName}>{plan.name}</span>
                <span className={styles.cardPrice}>
                  Gói {formatPlanPrice(plan.price)}
                  {plan.billingPeriod ? `/${plan.billingPeriod}` : ''}
                </span>
                <LotusOutline />
              </span>
            </li>
          );
        })}
      </ol>

      <div className={styles.ladderCallout}>
        <Sparkles size={22} aria-hidden="true" />
        <p>
          Chỉ cần <strong>1 dòng họ</strong> chọn gói {richest.name}, bạn nhận ngay{' '}
          <strong>{formatVnd(richest.commissionAmount)}</strong>.
        </p>
        <AmbassadorSignupButton className={cn(styles.cta, styles.ctaDark)}>
          Nhận mã đại sứ <ArrowRight size={18} aria-hidden="true" />
        </AmbassadorSignupButton>
      </div>
    </div>
  );
}
