'use client';

import { ArrowRight, CheckCircle2, Mail, Phone, UserRound, X } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Field } from '@/components/auth/form-fields';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { Presence } from '@/components/ui/presence';
import { registerAmbassador } from '@/lib/ambassador-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatPhone, phoneDigits } from '@/lib/phone';
import { SITE_POLICY_LINKS } from '@/lib/site-contact';
import { useBodyScrollLock } from '@/lib/use-body-scroll-lock';

// The ambassador form shares the plan registration's scroll-shaped dialog.
import styles from '@/components/pricing/pricing.module.css';

function PolicyLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className={styles.policy} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function AmbassadorSignupDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; again: boolean } | null>(null);
  useBodyScrollLock();

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
      const result = await registerAmbassador({
        fullName: fullName.trim(),
        phone: phoneDigits(phone),
        email: email.trim(),
        agreed,
      });
      setSent({ email: email.trim(), again: result.alreadyRegistered });
    } catch (caught: unknown) {
      setError(getApiErrorMessage(caught, 'đăng ký đại sứ'));
    } finally {
      setSending(false);
    }
  }

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
              Trở thành <em>Đại Sứ</em> Đời Đời
            </h2>
            <span className={styles.lotusRule} aria-hidden="true" />
            <p className={styles.scrollPlan}>
              Nhận <strong>mã đại sứ</strong> qua email ngay sau khi đăng ký
            </p>

            <div className={styles.formCard}>
              {sent ? (
                <div className={styles.thanks} role="status">
                  <CheckCircle2 size={44} strokeWidth={1.6} aria-hidden="true" />
                  <h3>{sent.again ? 'Đã gửi lại mã đại sứ' : 'Chào mừng Đại Sứ mới!'}</h3>
                  <p>
                    {sent.again
                      ? `Email ${sent.email} đã đăng ký trước đó. Chúng tôi vừa gửi lại mã đại sứ của bạn vào hộp thư này.`
                      : `Cảm ơn ${fullName.trim() || 'bạn'}. Mã đại sứ và hướng dẫn nhận hoa hồng đã được gửi tới ${sent.email}.`}{' '}
                    Nếu không thấy, hãy xem thêm mục Thư rác / Quảng cáo.
                  </p>
                  <button type="button" className={styles.submit} onClick={onClose}>
                    Đóng
                  </button>
                </div>
              ) : (
                <form className={styles.scrollForm} onSubmit={(event) => void submit(event)}>
                  <h3 className={styles.formHeading}>
                    <span className={styles.cloud} aria-hidden="true" />
                    Thông tin đại sứ
                  </h3>
                  <Field
                    id="ambassador-name"
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
                    id="ambassador-phone"
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
                  <Field
                    id="ambassador-email"
                    label="Email nhận mã đại sứ *"
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
                        <PolicyLink href={SITE_POLICY_LINKS.privacy}>Chính sách bảo mật</PolicyLink>{' '}
                        và{' '}
                        <PolicyLink href={SITE_POLICY_LINKS.terms}>
                          Quy định sử dụng dịch vụ
                        </PolicyLink>
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
                    Đăng ký làm đại sứ
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

/** A call-to-action button that opens the ambassador sign-up dialog. */
export function AmbassadorSignupButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [inBrowser, setInBrowser] = useState(false);
  useEffect(() => setInBrowser(true), []);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {/* On <body>, so a section's stacking context or overflow never clips or covers it. */}
      {inBrowser
        ? createPortal(
            <Presence>
              {open ? <AmbassadorSignupDialog onClose={() => setOpen(false)} /> : null}
            </Presence>,
            document.body,
          )
        : null}
    </>
  );
}
