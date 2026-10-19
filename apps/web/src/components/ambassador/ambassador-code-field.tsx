'use client';

import { HandHeart } from 'lucide-react';
import { useEffect } from 'react';

import { Field } from '@/components/auth/form-fields';
import { AMBASSADOR_CODE_PATTERN, normalizeAmbassadorCode, readReferralCode } from '@/lib/referral';

/** Optional ambassador code; filled in from a referral link the visitor opened earlier. */
export function AmbassadorCodeField({
  id,
  value,
  onChange,
  prefill = true,
  className,
  label = 'Mã đại sứ (nếu có)',
}: {
  id: string;
  value: string;
  onChange: (code: string) => void;
  /** The admin types codes from a registration, so their form leaves this off. */
  prefill?: boolean;
  className?: string;
  label?: string;
}) {
  useEffect(() => {
    if (!prefill) return;
    const stored = readReferralCode();
    if (stored) onChange(stored);
    // Only on mount: the visitor's own edits must not be overwritten.
  }, []);

  return (
    <Field
      id={id}
      name="ambassadorCode"
      label={label}
      icon={<HandHeart />}
      className={className}
      value={value}
      autoComplete="off"
      autoCapitalize="characters"
      spellCheck={false}
      pattern={AMBASSADOR_CODE_PATTERN}
      title="Mã đại sứ gồm 4–12 chữ cái hoặc chữ số."
      maxLength={12}
      placeholder="Ví dụ: DD7KQ2MX"
      onChange={(event) => onChange(normalizeAmbassadorCode(event.currentTarget.value))}
    />
  );
}
