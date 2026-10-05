import type { FamilyFeature, FamilyFeatures } from '@/types/family-tree';

/**
 * Top-level paths owned by the platform rather than a family. Every other first
 * segment is a family slug (`/{slug}`), which draws its own family header in
 * place of the site header. Add new top-level routes here.
 */
const PLATFORM_SEGMENTS = new Set(['', 'admin', 'login', 'register', 'doi-mat-khau']);

export function isFamilyRoute(pathname: string): boolean {
  const firstSegment = pathname.split('/')[1] ?? '';
  return !PLATFORM_SEGMENTS.has(firstSegment);
}

/** `/admin/{slug}`: the clan head's admin pages, which wear the family's navigation. */
export function isFamilyAdminRoute(pathname: string): boolean {
  const [, first, second] = pathname.split('/');
  return first === 'admin' && Boolean(second);
}

export type FamilyNavKey =
  'tree' | 'feed' | 'fund' | 'merit' | 'library' | 'announcements' | 'about';

export type FamilyNavItem = {
  key: FamilyNavKey;
  label: string;
  /** Path under `/{slug}`; empty is the family's home. Null while the section is still being built. */
  path: string | null;
  /** The switch the platform admin turns this section off with; none for sections always shown. */
  feature?: FamilyFeature;
  /** Listed in the phone's Menu sheet rather than given a tab of its own in the bottom bar. */
  menuOnly?: true;
};

/** The family sections, in menu order. Give a section its `path` once its page exists. */
export const FAMILY_NAV: readonly FamilyNavItem[] = [
  { key: 'tree', label: 'Gia phả', path: '' },
  { key: 'feed', label: 'Bảng tin', path: 'bang-tin', feature: 'feed' },
  { key: 'fund', label: 'Quỹ họ', path: 'quy-ho', feature: 'fund' },
  { key: 'merit', label: 'Công đức', path: 'cong-duc', feature: 'merit' },
  { key: 'library', label: 'Album', path: 'tu-lieu', feature: 'library' },
  { key: 'announcements', label: 'Thông báo', path: null },
  { key: 'about', label: 'Giới thiệu', path: 'gioi-thieu', menuOnly: true },
];

/** The sections a family shows: those the platform admin has not switched off. */
export function familyNav(features: FamilyFeatures | null): readonly FamilyNavItem[] {
  if (!features) return FAMILY_NAV;
  return FAMILY_NAV.filter((item) => !item.feature || features[item.feature]);
}

/** The switches the platform admin manages, in the order the admin lists them. */
export const FAMILY_FEATURE_CHOICES: readonly {
  feature: FamilyFeature;
  label: string;
  description: string;
}[] = [
  {
    feature: 'feed',
    label: 'Bảng tin',
    description: 'Thành viên đăng bài, bình luận và bày tỏ cảm xúc.',
  },
  {
    feature: 'fund',
    label: 'Quỹ họ',
    description: 'Sổ thu chi của dòng họ.',
  },
  {
    feature: 'merit',
    label: 'Công đức',
    description: 'Ghi nhận người công đức tiền mặt hoặc hiện vật cho từng sự kiện của dòng họ.',
  },
  {
    feature: 'library',
    label: 'Album và tư liệu',
    description: 'Album ảnh và tài liệu của dòng họ.',
  },
  {
    feature: 'editSuggestions',
    label: 'Đề xuất chỉnh sửa',
    description: 'Thành viên gửi đề xuất sửa thông tin một người trên cây để trưởng họ duyệt.',
  },
  {
    feature: 'printBook',
    label: 'In gia phả',
    description: 'Xuất cây gia phả thành quyển để in hoặc lưu PDF.',
  },
];

/** Whether  is in this section: its page or one below it, e.g. an album in Album. */
export function isInSection(pathname: string, href: string, path: string): boolean {
  return pathname === href || (path !== '' && pathname.startsWith(`${href}/`));
}

export function familyHref(slug: string, path: string): string {
  const base = `/${encodeURIComponent(slug)}`;
  return path ? `${base}/${path}` : base;
}
