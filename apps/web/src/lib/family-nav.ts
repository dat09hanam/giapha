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

export type FamilyNavKey = 'tree' | 'events' | 'announcements' | 'about';

export type FamilyNavItem = {
  key: FamilyNavKey;
  label: string;
  /** Path under `/{slug}`; empty is the family's home. Null while the section is still being built. */
  path: string | null;
};

/** The family sections, in menu order. Give a section its `path` once its page exists. */
export const FAMILY_NAV: readonly FamilyNavItem[] = [
  { key: 'tree', label: 'Gia phả', path: '' },
  { key: 'events', label: 'Sự kiện', path: null },
  { key: 'announcements', label: 'Thông báo', path: null },
  { key: 'about', label: 'Giới thiệu', path: null },
];

export function familyHref(slug: string, path: string): string {
  const base = `/${encodeURIComponent(slug)}`;
  return path ? `${base}/${path}` : base;
}
