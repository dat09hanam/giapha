import { apiFetch } from '@/lib/api-error';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/**
 * Limit on the file a visitor picks. It is looser than the API's own 2 MB cap
 * because cropping re-encodes to a small square before anything leaves the
 * browser; this only keeps a huge photo from being read into memory.
 */
export const MAX_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;

export type UploadedMedia = {
  fileName: string;
  /** Stored on the person record, e.g. `/media/<uuid>.jpg`. */
  url: string;
};

/** Resolves a stored media path to something an `<img>` can load. */
export function familyMediaSrc(slug: string, avatarUrl: string): string {
  if (!avatarUrl.startsWith('/media/')) return avatarUrl;

  const fileName = avatarUrl.slice('/media/'.length);
  return `${API_URL}/families/${encodeURIComponent(slug)}/media/${encodeURIComponent(fileName)}`;
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/**
 * Saves a family media file to the device as `<baseName>.<ext>`. The API serves media from
 * another origin behind the session cookie, where `<a download>` is ignored, so the file is
 * fetched first and saved from a local object URL.
 */
export async function downloadFamilyMedia(
  slug: string,
  url: string,
  baseName: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(familyMediaSrc(slug, url), { credentials: 'include' });
  } catch {
    throw new Error('Không kết nối được máy chủ để tải ảnh. Hãy kiểm tra mạng và thử lại.');
  }
  if (!response.ok) throw new Error('Không tải được ảnh này. Hãy thử lại sau.');
  const blob = await response.blob();
  const extension = EXTENSIONS[blob.type] ?? url.split('.').pop() ?? 'jpg';
  // Characters that file systems refuse become dashes; Vietnamese letters stay.
  const safeName = baseName.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'anh';
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${safeName}.${extension}`;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before the URL goes.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được tệp ảnh đã chọn.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const separator = result.indexOf('base64,');
      if (separator === -1) {
        reject(new Error('Không đọc được tệp ảnh đã chọn.'));
        return;
      }

      resolve(result.slice(separator + 'base64,'.length));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Best-effort cleanup of an upload the visitor discarded. The API refuses to
 * remove a file a saved person still points at, so a rejection here means the
 * caller should retry once that reference is gone.
 */
export function deleteFamilyMedia(slug: string, avatarUrl: string): Promise<void> {
  const fileName = avatarUrl.startsWith('/media/') ? avatarUrl.slice('/media/'.length) : null;
  if (!fileName) return Promise.resolve();

  return apiFetch<void>(
    `${API_URL}/families/${encodeURIComponent(slug)}/media/${encodeURIComponent(fileName)}`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    },
    'xóa tệp ảnh',
  );
}

export async function uploadFamilyMedia(slug: string, file: File): Promise<UploadedMedia> {
  const data = await readAsBase64(file);

  return apiFetch<UploadedMedia>(
    `${API_URL}/families/${encodeURIComponent(slug)}/media`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contentType: file.type, data }),
    },
    'tải ảnh lên',
  );
}
