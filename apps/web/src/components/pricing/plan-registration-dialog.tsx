'use client';

import { ArrowRight, CheckCircle2, Mail, Phone, UserRound, X } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';

import { Field } from '@/components/auth/form-fields';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { getApiErrorMessage } from '@/lib/api-error';
import { submitServiceRegistration } from '@/lib/pricing-api';
import { formatPlanPrice } from '@/lib/pricing-plans';
import { formatPhone, phoneDigits } from '@/lib/phone';
import { SITE_CONTACT } from '@/lib/site-contact';
import type { PricingPlan } from '@/types/pricing';

import styles from './pricing.module.css';

function PolicyLink({ href, children }: { href: string; children: ReactNode }) {
  if (href === '#' || href === '') return <span className={styles.policy}>{children}</span>;
  return (
    <a className={styles.policy} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function PlanRegistrationDialog({
  plan,
  onClose,
}: {
  plan: PricingPlan;
  onClose: () => void;
}) {
  const titleId = useId();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !sending) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sending, onClose]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      await submitServiceRegistration({
        planId: plan.id,
        fullName,
        email,
        phone: phoneDigits(phone),
        agreed,
      });
      setSent(true);
    } catch (caught: unknown) {
      setError(getApiErrorMessage(caught, 'gửi đăng ký'));
    } finally {
      setSending(false);
    }
  }

  const price =
    formatPlanPrice(plan.price) +
    (plan.price > 0 && plan.billingPeriod ? `/${plan.billingPeriod}` : '');

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-3 sm:p-4">
      <button
        type="button"
        className="ui-backdrop fixed inset-0 bg-stone-950/50 backdrop-blur-[2px]"
        aria-label="Đóng"
        tabIndex={-1}
        onClick={() => !sending && onClose()}
      />
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className={styles.scroll}>
        <span className={styles.rod} aria-hidden="true">
          <span className={styles.rodSeal} />
        </span>
        <div className={styles.sheetClip}>
          <div className={styles.sheet}>
            <span className={styles.sheetArt} aria-hidden="true" />
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className={styles.close}
              aria-label="Đóng"
            >
              <X size={20} aria-hidden="true" />
            </button>
            <h2 id={titleId} className={styles.scrollTitle}>
              Đăng ký dịch vụ <em>gia phả</em>
            </h2>
            <span className={styles.lotusRule} aria-hidden="true" />
            <p className={styles.scrollPlan}>
              Gói <strong>{plan.name}</strong> · {price}
            </p>

            <div className={styles.formCard}>
              {sent ? (
                <div className={styles.thanks} role="status">
                  <CheckCircle2 size={44} strokeWidth={1.6} aria-hidden="true" />
                  <h3>Đã gửi đăng ký</h3>
                  <p>
                    Cảm ơn {fullName.trim() || 'bạn'}. Chúng tôi sẽ liên hệ qua số điện thoại hoặc
                    email bạn để lại trong thời gian sớm nhất.
                  </p>
                  <button type="button" className={styles.submit} onClick={onClose}>
                    Đóng
                  </button>
                </div>
              ) : (
                <form className={styles.scrollForm} onSubmit={(event) => void submit(event)}>
                  <h3 className={styles.formHeading}>
                    <span className={styles.cloud} aria-hidden="true" />
                    Nhập thông tin đăng ký
                  </h3>
                  <Field
                    id="signup-name"
                    label="Họ và tên *"
                    icon={<UserRound />}
                    className={styles.input}
                    value={fullName}
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                    required
                    placeholder="Nhập họ và tên của bạn"
                    onChange={(event) => setFullName(event.currentTarget.value)}
                  />
                  <Field
                    id="signup-email"
                    label="Email *"
                    icon={<Mail />}
                    className={styles.input}
                    type="email"
                    value={email}
                    autoComplete="email"
                    maxLength={191}
                    required
                    placeholder="Nhập địa chỉ email của bạn"
                    onChange={(event) => setEmail(event.currentTarget.value)}
                  />
                  <Field
                    id="signup-phone"
                    label="Số điện thoại *"
                    icon={<Phone />}
                    className={styles.input}
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    autoComplete="tel"
                    pattern="0\d{3}\.\d{3}\.\d{3}"
                    title="Số điện thoại gồm 10 chữ số, bắt đầu bằng 0."
                    maxLength={12}
                    required
                    placeholder="Nhập số điện thoại của bạn"
                    onChange={(event) => setPhone(formatPhone(event.currentTarget.value))}
                  />
                  <div className="grid gap-1.5" data-field="">
                    <label className={styles.consent}>
                      <input
                        type="checkbox"
                        checked={agreed}
                        required
                        onChange={(event) => setAgreed(event.currentTarget.checked)}
                      />
                      <span>
                        Tôi đồng ý với{' '}
                        <PolicyLink href={SITE_CONTACT.privacy}>Chính sách bảo mật</PolicyLink> và{' '}
                        <PolicyLink href={SITE_CONTACT.terms}>Quy định sử dụng dịch vụ</PolicyLink>
                      </span>
                    </label>
                    <span className={styles.consentError} data-field-error="" aria-live="polite" />
                  </div>
                  {error ? (
                    <p className={styles.formError} role="alert">
                      {error}
                    </p>
                  ) : null}
                  <button type="submit" className={styles.submit} disabled={sending}>
                    {sending ? <InlineLoader className="size-4" /> : null}
                    Gửi thông tin
                    {sending ? null : <ArrowRight size={18} aria-hidden="true" />}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
        <span className={styles.rod} aria-hidden="true" />
      </section>
    </div>
  );
}
