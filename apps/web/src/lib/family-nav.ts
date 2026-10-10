import type { FamilyFeature, FamilyFeatures } from '@/types/family-tree';

const PLATFORM_SEGMENTS = new Set([
  '',
  'admin',
  'login',
  'register',
  'doi-mat-khau',
  'gia-pha-mau',
  'mau-bai-cung',
  'thu-vien',
]);

export function isFamilyRoute(pathname: string): boolean {
  const firstSegment = pathname.split('/')[1] ?? '';
  return !PLATFORM_SEGMENTS.has(firstSegment);
}

export function isFamilyAdminRoute(pathname: string): boolean {
  const [, first, second] = pathname.split('/');
  return first === 'admin' && Boolean(second);
}

export type FamilyNavKey =
  'home' | 'tree' | 'feed' | 'fund' | 'merit' | 'library' | 'announcements';

export type FamilyNavItem = {
  key: FamilyNavKey;
  label: string;
  path: string | null;
  feature?: FamilyFeature;
  menuOnly?: true;
};

export const FAMILY_NAV: readonly FamilyNavItem[] = [
  { key: 'home', label: 'Trang chủ', path: '' },
  { key: 'tree', label: 'Gia phả', path: 'gia-pha' },
  { key: 'feed', label: 'Bảng tin', path: 'bang-tin', feature: 'feed' },
  { key: 'fund', label: 'Quỹ họ', path: 'quy-ho', feature: 'fund' },
  { key: 'merit', label: 'Công đức', path: 'cong-duc', feature: 'merit' },
  { key: 'library', label: 'Album', path: 'tu-lieu', feature: 'library' },
  { key: 'announcements', label: 'Thông báo', path: null },
];

export function familyNav(features: FamilyFeatures | null): readonly FamilyNavItem[] {
  if (!features) return FAMILY_NAV;
  return FAMILY_NAV.filter((item) => !item.feature || features[item.feature]);
}

export function isInSection(pathname: string, href: string, path: string): boolean {
  return pathname === href || (path !== '' && pathname.startsWith(`${href}/`));
}

export function familyHref(slug: string, path: string): string {
  const base = `/${encodeURIComponent(slug)}`;
  return path ? `${base}/${path}` : base;
}
