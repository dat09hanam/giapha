/**
 * Top-level paths owned by the platform rather than a family. Every other first
 * segment is a family slug (`/{slug}`), which draws its own family header in
 * place of the site header. Add new top-level routes here.
 */
const PLATFORM_SEGMENTS = new Set(['', 'admin', 'login', 'register']);

export function isFamilyRoute(pathname: string): boolean {
  const firstSegment = pathname.split('/')[1] ?? '';
  return !PLATFORM_SEGMENTS.has(firstSegment);
}

/** `/admin/{slug}`: the clan head's admin pages, which wear the family's navigation. */
export function isFamilyAdminRoute(pathname: string): boolean {
  const [, first, second] = pathname.split('/');
  return first === 'admin' && Boolean(second);
}

export type FamilyNavKey = 'tree' | 'feed' | 'fund' | 'library' | 'announcements' | 'about';

export type FamilyNavItem = {
  key: FamilyNavKey;
  label: string;
  /** Path under `/{slug}`; empty is the family's home. Null while the section is still being built. */
  path: string | null;
};

/** The family sections, in menu order. Give a section its `path` once its page exists. */
export const FAMILY_NAV: readonly FamilyNavItem[] = [
  { key: 'tree', label: 'Gia phả', path: '' },
  { key: 'feed', label: 'Bảng tin', path: 'bang-tin' },
  { key: 'fund', label: 'Quỹ họ', path: 'quy-ho' },
  { key: 'library', label: 'Album', path: 'tu-lieu' },
  { key: 'announcements', label: 'Thông báo', path: null },
  { key: 'about', label: 'Giới thiệu', path: null },
];

/** Whether  is in this section: its page or one below it, e.g. an album in Album. */
export function isInSection(pathname: string, href: string, path: string): boolean {
  return pathname === href || (path !== '' && pathname.startsWith(`${href}/`));
}

export function familyHref(slug: string, path: string): string {
  const base = `/${encodeURIComponent(slug)}`;
  return path ? `${base}/${path}` : base;
}
