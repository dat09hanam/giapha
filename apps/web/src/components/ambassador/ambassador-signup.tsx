'use client';

import { ArrowRight, CheckCircle2, Mail, Phone, UserRound } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Field } from '@/components/auth/form-fields';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { ScrollDialog } from '@/components/ui/scroll-dialog';
import { Presence } from '@/components/ui/presence';
import { registerAmbassador } from '@/lib/ambassador-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatPhone, phoneDigits } from '@/lib/phone';
import { SITE_POLICY_LINKS } from '@/lib/site-contact';

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
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; again: boolean } | null>(null);

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
    <ScrollDialog
      title={
        <>
          Trở thành <em>Đại Sứ</em> Đời Đời
        </>
      }
      subtitle={
        <>
          Nhận <strong>mã đại sứ</strong> qua email ngay sau khi đăng ký
        </>
      }
      onClose={onClose}
      busy={sending}
    >
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
                  <PolicyLink href={SITE_POLICY_LINKS.privacy}>Chính sách bảo mật</PolicyLink> và{' '}
                  <PolicyLink href={SITE_POLICY_LINKS.terms}>Quy định sử dụng dịch vụ</PolicyLink>
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
    </ScrollDialog>
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
