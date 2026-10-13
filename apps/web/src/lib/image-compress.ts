import { readAsBase64 } from '@/lib/media-api';

export type EncodedImageType = 'image/webp' | 'image/jpeg';

export type CompressedImage = {
  contentType: EncodedImageType;
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

// Unknown until the first encode: browsers that cannot write WebP silently return PNG instead.
let webpEncoding: boolean | undefined;

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Không nén được ảnh.'))),
      type,
      quality,
    );
  });
}

/**
 * Encodes a canvas as WebP, which is about a third smaller than JPEG at the same visible quality,
 * and falls back to JPEG on browsers that cannot write WebP.
 */
export async function encodeCanvas(
  canvas: HTMLCanvasElement,
  quality: number,
  { webp = true }: { webp?: boolean } = {},
): Promise<{ blob: Blob; type: EncodedImageType }> {
  if (webp && webpEncoding !== false) {
    const blob = await canvasBlob(canvas, 'image/webp', quality);
    webpEncoding = blob.type === 'image/webp';
    if (webpEncoding) return { blob, type: 'image/webp' };
  }
  return { blob: await canvasBlob(canvas, 'image/jpeg', quality), type: 'image/jpeg' };
}

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

type EncodeOptions = { webp?: boolean; transparent?: boolean };

async function encode(
  image: HTMLImageElement,
  edge: number,
  quality: number,
  { transparent = false, ...options }: EncodeOptions = {},
): Promise<{ blob: Blob; type: EncodedImageType; width: number; height: number }> {
  const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Trình duyệt không xử lý được ảnh.');
  if (!transparent) {
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(image, 0, 0, width, height);
  const { blob, type } = await encodeCanvas(canvas, quality, options);
  if (transparent && type !== 'image/webp') {
    throw new Error('Trình duyệt không nén được ảnh có nền trong suốt.');
  }
  return { blob, type, width, height };
}

/**
 * `transparent` keeps the alpha channel instead of flattening onto white. It needs WebP, the only
 * alpha-capable format a canvas writes compactly, and throws on browsers that cannot write it.
 */
export async function compressImage(
  file: File,
  maxBytes: number,
  { maxEdge = 1600, transparent = false }: { maxEdge?: number; transparent?: boolean } = {},
): Promise<CompressedImage> {
  const image = await loadImage(file);
  for (const attempt of ATTEMPTS) {
    const { blob, type, width, height } = await encode(
      image,
      Math.round(maxEdge * attempt.edge),
      attempt.quality,
      { transparent },
    );
    if (blob.size <= maxBytes || attempt === ATTEMPTS.at(-1)) {
      if (blob.size > maxBytes) throw new Error('Ảnh quá lớn, hãy chọn ảnh khác.');
      const data = await readAsBase64(new File([blob], 'photo', { type }));
      return {
        contentType: type,
        data,
        width,
        height,
        previewUrl: URL.createObjectURL(blob),
      };
    }
  }
  throw new Error('Ảnh quá lớn, hãy chọn ảnh khác.');
}

/** Always JPEG: the library API stores thumbnails as `image/jpeg`. */
export async function makeThumbnail(file: Blob): Promise<string> {
  const image = await loadImage(file);
  const { blob } = await encode(image, 480, 0.72, { webp: false });
  return readAsBase64(new File([blob], 'thumb.jpg', { type: 'image/jpeg' }));
}
