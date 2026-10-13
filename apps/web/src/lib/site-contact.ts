import type { SiteContact } from '@/types/site-contact';

/** Shown when the API cannot be reached; the admin edits the real values in /admin. */
export const DEFAULT_SITE_CONTACT: SiteContact = {
  phone: '0123 456 789',
  zalo: null,
  email: 'support@giaphaviet.vn',
  address: 'Hà Nội, Việt Nam',
  hours: 'Hàng Ngày: 6:00 - 24:00',
  facebookUrl: null,
  youtubeUrl: null,
  tiktokUrl: null,
};

export const SITE_POLICY_LINKS = {
  privacy: '#',
  terms: '#',
};

export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function zaloHref(contact: Pick<SiteContact, 'phone' | 'zalo'>): string {
  return `https://zalo.me/${(contact.zalo ?? contact.phone).replace(/\D/g, '')}`;
}
