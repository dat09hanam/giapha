import { apiFetch } from '@/lib/api-error';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export type LibraryItem = {
  id: string;
  kind: 'PHOTO' | 'DOCUMENT';
  albumId: string | null;
  url: string;
  thumbUrl: string | null;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  title: string | null;
  description: string | null;
  takenOn: string | null;
  createdAt: string;
  person: { id: string; name: string; honorific: string | null } | null;
  pending: boolean;
  uploadedBy: string | null;
};

export type AlbumSummary = {
  id: string;
  title: string;
  description: string | null;
  photoCount: number;
  cover: { url: string; width: number | null; height: number | null } | null;
  createdAt: string;
  updatedAt: string;
  pendingCount: number;
};

export type LibraryOverview = {
  albums: AlbumSummary[];
  documents: LibraryItem[];
  canManage: boolean;
};

export type AlbumDetail = {
  album: AlbumSummary;
  photos: LibraryItem[];
  pendingPhotos: LibraryItem[];
  canManage: boolean;
};

export type ItemDetails = {
  title?: string | null;
  description?: string | null;
  takenOn?: string | null;
  personId?: string | null;
};

export type FileUpload = {
  contentType: string;
  data: string;
  width?: number;
  height?: number;
  thumbData?: string;
};

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;

function libraryUrl(slug: string, path = ''): string {
  return `${API_URL}/families/${encodeURIComponent(slug)}/library${path}`;
}

function send<T>(url: string, method: string, action: string, body?: unknown): Promise<T> {
  return apiFetch<T>(
    url,
    {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    action,
  );
}

export function createAlbum(
  slug: string,
  input: { title: string; description: string | null },
): Promise<AlbumSummary> {
  return send(libraryUrl(slug, '/albums'), 'POST', 'tạo album', input);
}

export function updateAlbum(
  slug: string,
  albumId: string,
  input: { title: string; description: string | null },
): Promise<AlbumSummary> {
  return send(
    libraryUrl(slug, `/albums/${encodeURIComponent(albumId)}`),
    'PATCH',
    'sửa album',
    input,
  );
}

export function deleteAlbum(slug: string, albumId: string): Promise<void> {
  return send(libraryUrl(slug, `/albums/${encodeURIComponent(albumId)}`), 'DELETE', 'xóa album');
}

export function uploadAlbumPhoto(
  slug: string,
  albumId: string,
  input: FileUpload & ItemDetails,
): Promise<LibraryItem> {
  return send(
    libraryUrl(slug, `/albums/${encodeURIComponent(albumId)}/photos`),
    'POST',
    'tải ảnh lên',
    input,
  );
}

export function createDocument(
  slug: string,
  input: FileUpload & ItemDetails & { title: string },
): Promise<LibraryItem> {
  return send(libraryUrl(slug, '/documents'), 'POST', 'thêm tư liệu', input);
}

export function updateLibraryItem(
  slug: string,
  itemId: string,
  input: ItemDetails,
): Promise<LibraryItem> {
  return send(
    libraryUrl(slug, `/items/${encodeURIComponent(itemId)}`),
    'PATCH',
    'lưu thông tin',
    input,
  );
}

export function approveLibraryPhoto(slug: string, itemId: string): Promise<LibraryItem> {
  return send(
    libraryUrl(slug, `/items/${encodeURIComponent(itemId)}/approve`),
    'POST',
    'duyệt ảnh',
  );
}

export function deleteLibraryItem(slug: string, itemId: string): Promise<void> {
  return send(libraryUrl(slug, `/items/${encodeURIComponent(itemId)}`), 'DELETE', 'xóa');
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
