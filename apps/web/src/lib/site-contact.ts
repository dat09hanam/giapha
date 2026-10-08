/**
 * How visitors reach the Gia Phả Đời Đời team, shown in the footer and the "Liên hệ tạo gia
 * phả" popup. These are the design's placeholders; replace them with the real hotline, Zalo,
 * pages and mailbox before launch. A social page left as null is not shown.
 */
export const SITE_CONTACT = {
  address: 'Hà Nội, Việt Nam',
  email: 'support@giaphaviet.vn',
  /** Also the Zalo number, as most Vietnamese hotlines are. */
  phone: '0123 456 789',
  hours: 'Thứ 2 - Thứ 6: 8:00 - 17:00',
  facebook: '#' as string | null,
  youtube: '#' as string | null,
  tiktok: null as string | null,
  privacy: '#',
  terms: '#',
};

export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, '')}`;
}

/** Zalo opens a chat from the phone number alone. */
export function zaloHref(phone: string): string {
  return `https://zalo.me/${phone.replace(/\D/g, '')}`;
}
