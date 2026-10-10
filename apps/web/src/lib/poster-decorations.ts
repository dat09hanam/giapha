import { apiFetch } from '@/lib/api-error';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export type PosterDecorationKind = 'BACKGROUND';
export type PosterBackgroundMode = 'STRETCH' | 'COVER' | 'TILE';

export type PosterInsets = { top: number; right: number; bottom: number; left: number };

export type PosterNameArea = PosterInsets & {
  curve: number;
  color: string;
};

export type PosterVerticalTextArea = PosterInsets & { color: string };

export type PosterDecoration = {
  id: string;
  kind: PosterDecorationKind;
  name: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  backgroundMode: PosterBackgroundMode | null;
  insets: PosterInsets | null;
  nameArea: PosterNameArea | null;
  leftTextArea: PosterVerticalTextArea | null;
  rightTextArea: PosterVerticalTextArea | null;
};

export type AdminPosterDecoration = PosterDecoration & { usageCount: number };

export type FamilyPoster = {
  background: PosterDecoration | null;
  leftText: string | null;
  rightText: string | null;
};

export const MAX_INSET_PERCENT = 80;
export const MAX_OPPOSITE_INSETS_PERCENT = 80;
export const MAX_NAME_INSET_PERCENT = 95;
export const MIN_NAME_AREA_PERCENT = 5;
export const DEFAULT_NAME_COLOR = '#d4af37';
export const MAX_DECORATION_IMAGE_BYTES = 4 * 1024 * 1024;

export function decorationImageSrc(decoration: PosterDecoration): string | null {
  if (!decoration.imageUrl) return null;
  if (decoration.imageUrl.startsWith('blob:')) return decoration.imageUrl;
  return API_URL + decoration.imageUrl;
}

export type PosterDecorationImage = { contentType: string; data: string };

export type PosterDecorationOptions = {
  name: string;
  isActive: boolean;
  sortOrder: number;
  backgroundMode: PosterBackgroundMode;
  insets: PosterInsets | null;
  nameArea: PosterNameArea | null;
  leftTextArea: PosterVerticalTextArea | null;
  rightTextArea: PosterVerticalTextArea | null;
};

const JSON_HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };

export function listPosterDecorations<T extends PosterDecoration = PosterDecoration>(): Promise<
  T[]
> {
  return apiFetch<T[]>(
    `${API_URL}/poster-decorations`,
    { credentials: 'include', headers: { Accept: 'application/json' }, cache: 'no-store' },
    'tải thư viện hình nền',
  );
}

export function createPosterDecoration(
  input: Partial<PosterDecorationOptions> & {
    kind: PosterDecorationKind;
    name: string;
    image: PosterDecorationImage;
  },
): Promise<PosterDecoration> {
  return apiFetch<PosterDecoration>(
    `${API_URL}/poster-decorations`,
    { method: 'POST', credentials: 'include', headers: JSON_HEADERS, body: JSON.stringify(input) },
    'thêm hình nền',
  );
}

export function updatePosterDecoration(
  id: string,
  input: Partial<PosterDecorationOptions> & { image?: PosterDecorationImage },
): Promise<PosterDecoration> {
  return apiFetch<PosterDecoration>(
    `${API_URL}/poster-decorations/${encodeURIComponent(id)}`,
    { method: 'PATCH', credentials: 'include', headers: JSON_HEADERS, body: JSON.stringify(input) },
    'cập nhật hình nền',
  );
}

export function deletePosterDecoration(id: string): Promise<void> {
  return apiFetch<void>(
    `${API_URL}/poster-decorations/${encodeURIComponent(id)}`,
    { method: 'DELETE', credentials: 'include', headers: { Accept: 'application/json' } },
    'xóa hình nền',
  );
}
