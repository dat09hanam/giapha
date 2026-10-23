'use client';

import { useId, useState } from 'react';

import { formatVnd } from '@/lib/vietnamese-number';

import styles from './ambassador.module.css';

export type CommissionPlan = {
  id: string;
  name: string;
  commissionPercent: number;
  /** In đồng: the percent of the plan price. */
  commissionAmount: number;
};

const MAX_FAMILIES = 30;

/** Lets a visitor see what referring a few families a month would earn them. */
export function EarningsCalculator({ plans }: { plans: readonly CommissionPlan[] }) {
  const rangeId = useId();
  const [families, setFamilies] = useState(5);
  const [planId, setPlanId] = useState(
    plans.reduce((best, plan) => (plan.commissionAmount > best.commissionAmount ? plan : best)).id,
  );
  const plan = plans.find((choice) => choice.id === planId) ?? plans[0];
  const monthly = families * (plan?.commissionAmount ?? 0);

  return (
    <div className={styles.calc}>
      <div className={styles.calcPanel}>
        <div>
          <label className={styles.calcLabel} htmlFor={rangeId}>
            Số dòng họ bạn giới thiệu mỗi tháng
            <output htmlFor={rangeId}>{families}</output>
          </label>
          <input
            id={rangeId}
            className={styles.range}
            type="range"
            min={1}
            max={MAX_FAMILIES}
            value={families}
            onChange={(event) => setFamilies(Number(event.currentTarget.value))}
          />
        </div>
        <div>
          <p className={styles.calcLabel}>Gói dịch vụ dòng họ chọn</p>
          <div className={styles.planChoices} role="group" aria-label="Gói dịch vụ">
            {plans.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className={styles.planChoice}
                aria-pressed={choice.id === planId}
                onClick={() => setPlanId(choice.id)}
              >
                {choice.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.calcResult} aria-live="polite">
        <p>Thu nhập ước tính mỗi tháng</p>
        <strong>{formatVnd(monthly)}</strong>
        <p className={styles.calcYear}>
          Tương đương <b>{formatVnd(monthly * 12)}</b> mỗi năm
        </p>
        <p className={styles.calcHint}>
          {families} dòng họ × {formatVnd(plan?.commissionAmount ?? 0)} ({plan?.commissionPercent}%
          giá gói {plan?.name}). Con số chỉ để tham khảo.
        </p>
      </div>
    </div>
  );
}
