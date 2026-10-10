import { apiFetch } from '@/lib/api-error';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;

export type UploadedMedia = {
  fileName: string;
  url: string;
};

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
  const safeName = baseName.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'anh';
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${safeName}.${extension}`;
  document.body.append(link);
  link.click();
  link.remove();
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
