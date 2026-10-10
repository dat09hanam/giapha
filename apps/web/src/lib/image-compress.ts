import { readAsBase64 } from '@/lib/media-api';

export type CompressedImage = {
  contentType: 'image/jpeg';
  data: string;
  width: number;
  height: number;
  previewUrl: string;
};

const ATTEMPTS = [
  { edge: 1, quality: 0.82 },
  { edge: 1, quality: 0.68 },
  { edge: 0.8, quality: 0.62 },
  { edge: 0.64, quality: 0.55 },
] as const;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh này. Hãy chọn ảnh JPG hoặc PNG.'));
    };
    image.src = url;
  });
}

function encode(image: HTMLImageElement, edge: number, quality: number) {
  const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Trình duyệt không xử lý được ảnh.');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return new Promise<{ blob: Blob; width: number; height: number }>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve({ blob, width, height }) : reject(new Error('Không nén được ảnh.')),
      'image/jpeg',
      quality,
    );
  });
}

export async function compressImage(
  file: File,
  maxBytes: number,
  { maxEdge = 1600 }: { maxEdge?: number } = {},
): Promise<CompressedImage> {
  const image = await loadImage(file);
  for (const attempt of ATTEMPTS) {
    const { blob, width, height } = await encode(
      image,
      Math.round(maxEdge * attempt.edge),
      attempt.quality,
    );
    if (blob.size <= maxBytes || attempt === ATTEMPTS.at(-1)) {
      if (blob.size > maxBytes) throw new Error('Ảnh quá lớn, hãy chọn ảnh khác.');
      const data = await readAsBase64(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
      return {
        contentType: 'image/jpeg',
        data,
        width,
        height,
        previewUrl: URL.createObjectURL(blob),
      };
    }
  }
  throw new Error('Ảnh quá lớn, hãy chọn ảnh khác.');
}

export async function makeThumbnail(file: Blob): Promise<string> {
  const image = await loadImage(file);
  const { blob } = await encode(image, 480, 0.72);
  return readAsBase64(new File([blob], 'thumb.jpg', { type: 'image/jpeg' }));
}
