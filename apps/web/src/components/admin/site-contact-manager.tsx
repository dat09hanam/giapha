'use client';

import { Contact } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { SectionCard } from '@/components/admin/admin-layout';
import { Field } from '@/components/auth/form-fields';
import { Button } from '@/components/ui/button';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { displayPhone, formatPhone, phoneOrNull } from '@/lib/phone';
import { updateSiteContact } from '@/lib/site-contact-api';
import type { SiteContact } from '@/types/site-contact';

/** Every field as the input shows it; optional fields are '' while empty. */
type Draft = Record<keyof SiteContact, string>;

function toDraft(contact: SiteContact): Draft {
  return {
    phone: displayPhone(contact.phone),
    zalo: contact.zalo ? displayPhone(contact.zalo) : '',
    email: contact.email,
    address: contact.address,
    hours: contact.hours,
    facebookUrl: contact.facebookUrl ?? '',
    youtubeUrl: contact.youtubeUrl ?? '',
    tiktokUrl: contact.tiktokUrl ?? '',
  };
}

function toInput(draft: Draft): SiteContact {
  const optional = (value: string): string | null => value.trim() || null;
  return {
    phone: phoneOrNull(draft.phone) ?? '',
    zalo: phoneOrNull(draft.zalo),
    email: draft.email.trim(),
    address: draft.address.trim(),
    hours: draft.hours.trim(),
    facebookUrl: optional(draft.facebookUrl),
    youtubeUrl: optional(draft.youtubeUrl),
    tiktokUrl: optional(draft.tiktokUrl),
  };
}

export function SiteContactManager({ initial }: { initial: SiteContact }) {
  const router = useRouter();
  const showToast = useToast();
  const [saved, setSaved] = useState(() => toDraft(initial));
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  function set(key: keyof Draft, value: string): void {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    try {
      const next = toDraft(await updateSiteContact(toInput(draft)));
      setSaved(next);
      setDraft(next);
      // The public pages read the contact from the root layout; refresh it so they show the change.
      router.refresh();
      showToast({ kind: 'success', message: 'Đã lưu thông tin liên hệ.' });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'lưu thông tin liên hệ') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <SectionCard
        icon={<Contact aria-hidden="true" />}
        title="Thông tin liên hệ"
        description="Hiện ở chân trang, hộp “Liên hệ tạo gia phả” và hộp báo đã đạt giới hạn gói."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={!dirty || saving}
              onClick={() => setDraft(saved)}
            >
              Hoàn tác
            </Button>
            <Button type="submit" disabled={!dirty || saving}>
              {saving ? <InlineLoader className="size-4" /> : null}
              Lưu thông tin liên hệ
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="contact-phone"
              label="Hotline"
              type="tel"
              inputMode="tel"
              required
              maxLength={12}
              value={draft.phone}
              placeholder="0912.345.678"
              onChange={(event) => set('phone', formatPhone(event.currentTarget.value))}
            />
            <Field
              id="contact-zalo"
              label="Số Zalo — để trống nếu trùng hotline"
              type="tel"
              inputMode="tel"
              maxLength={12}
              value={draft.zalo}
              placeholder={draft.phone || 'Dùng số hotline'}
              onChange={(event) => set('zalo', formatPhone(event.currentTarget.value))}
            />
            <Field
              id="contact-email"
              label="Email"
              type="email"
              required
              maxLength={191}
              value={draft.email}
              placeholder="hotro@example.vn"
              onChange={(event) => set('email', event.currentTarget.value)}
            />
            <Field
              id="contact-hours"
              label="Giờ làm việc"
              required
              minLength={2}
              maxLength={100}
              value={draft.hours}
              placeholder="Hàng ngày: 8:00 - 21:00"
              onChange={(event) => set('hours', event.currentTarget.value)}
            />
          </div>
          <Field
            id="contact-address"
            label="Địa chỉ"
            required
            minLength={2}
            maxLength={200}
            value={draft.address}
            placeholder="Hà Nội, Việt Nam"
            onChange={(event) => set('address', event.currentTarget.value)}
          />

          <div className="grid gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Mạng xã hội — để trống để ẩn
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                id="contact-facebook"
                label="Facebook"
                type="url"
                maxLength={500}
                value={draft.facebookUrl}
                placeholder="https://facebook.com/…"
                onChange={(event) => set('facebookUrl', event.currentTarget.value)}
              />
              <Field
                id="contact-youtube"
                label="YouTube"
                type="url"
                maxLength={500}
                value={draft.youtubeUrl}
                placeholder="https://youtube.com/@…"
                onChange={(event) => set('youtubeUrl', event.currentTarget.value)}
              />
              <Field
                id="contact-tiktok"
                label="TikTok"
                type="url"
                maxLength={500}
                value={draft.tiktokUrl}
                placeholder="https://tiktok.com/@…"
                onChange={(event) => set('tiktokUrl', event.currentTarget.value)}
              />
            </div>
          </div>
        </div>
      </SectionCard>
    </form>
  );
}
