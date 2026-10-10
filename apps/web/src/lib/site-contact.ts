export const SITE_CONTACT = {
  address: 'Hà Nội, Việt Nam',
  email: 'support@giaphaviet.vn',
  phone: '0123 456 789',
  hours: 'Hàng Ngày: 6:00 - 24:00',
  facebook: '#' as string | null,
  youtube: '#' as string | null,
  tiktok: null as string | null,
  privacy: '#',
  terms: '#',
};

export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, '')}`;
}

export function zaloHref(phone: string): string {
  return `https://zalo.me/${phone.replace(/\D/g, '')}`;
}
