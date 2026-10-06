import { apiFetch } from '@/lib/api-error';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

/*
 * The platform-wide phả đồ background library. The platform ADMIN manages it
 * and marks where the tree goes on each one; family heads pick one background.
 */

export type PosterDecorationKind = 'BACKGROUND';
export type PosterBackgroundMode = 'STRETCH' | 'COVER' | 'TILE';

/** Percent of the art on each edge. */
export type PosterInsets = { top: number; right: number; bottom: number; left: number };

/** Where the family name is written over a background's art, and how it bends. */
export type PosterNameArea = PosterInsets & {
  /** How far the name's middle rises above its ends, in percent of the area's height. */
  curve: number;
  color: string;
};

/** Where one family-specific line is written from top to bottom. */
export type PosterVerticalTextArea = PosterInsets & { color: string };

export type PosterDecoration = {
  id: string;
  kind: PosterDecorationKind;
  name: string;
  /** API-relative path of an uploaded image; resolve with `decorationImageSrc`. */
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  backgroundMode: PosterBackgroundMode | null;
  /** The area the ADMIN marked for the tree; null keeps the tree inside the frame band. */
  insets: PosterInsets | null;
  /** Where the family name is written; null writes none. */
  nameArea: PosterNameArea | null;
  /** Optional areas for the family's two vertical couplet lines. */
  leftTextArea: PosterVerticalTextArea | null;
  rightTextArea: PosterVerticalTextArea | null;
};

export type AdminPosterDecoration = PosterDecoration & { usageCount: number };

/** What a family's sheet shows; a null background shows plain paper. */
export type FamilyPoster = {
  background: PosterDecoration | null;
  leftText: string | null;
  rightText: string | null;
};

/** Matches the API's limits on decoration insets. */
export const MAX_INSET_PERCENT = 80;
export const MAX_OPPOSITE_INSETS_PERCENT = 80;
export const MAX_NAME_INSET_PERCENT = 95;
/** The name area may be a thin band, but must still be this wide and tall. */
export const MIN_NAME_AREA_PERCENT = 5;
export const DEFAULT_NAME_COLOR = '#d4af37';
/** Matches the API's limit on decoration uploads. */
export const MAX_DECORATION_IMAGE_BYTES = 4 * 1024 * 1024;

export function decorationImageSrc(decoration: PosterDecoration): string | null {
  if (!decoration.imageUrl) return null;
  // A local preview of a file the ADMIN has picked but not uploaded yet.
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
