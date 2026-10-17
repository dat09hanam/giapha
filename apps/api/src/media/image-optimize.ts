import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

/**
 * Larger than every edge the web client resizes to (posters use 2560), so pictures that already
 * went through the browser keep their dimensions and only direct API uploads get shrunk.
 */
const DEFAULT_MAX_EDGE = 2560;
const WEBP_QUALITY = 80;

/** Pixels sharp may decode; stops a tiny file that declares a huge canvas from exhausting memory. */
const MAX_INPUT_PIXELS = 50_000_000;

export type OptimizedImage = { bytes: Buffer; extension: 'webp'; contentType: 'image/webp' };

/**
 * Re-encodes an uploaded picture as WebP: applies the EXIF rotation, drops metadata (camera, GPS),
 * keeps transparency and caps the longer edge. A WebP upload that is already smaller than the
 * re-encoded result is kept as is, so compressing twice never makes a file bigger.
 */
export async function optimizeImage(
  bytes: Buffer,
  sourceExtension: string,
  { maxEdge = DEFAULT_MAX_EDGE }: { maxEdge?: number } = {},
): Promise<OptimizedImage> {
  try {
    const image = sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' });
    const { width = 0, height = 0, exif, xmp } = await image.metadata();
    const needsResize = Math.max(width, height) > maxEdge;

    const encoded = await image
      .rotate()
      .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();

    const keepOriginal =
      sourceExtension === 'webp' && !needsResize && !exif && !xmp && bytes.length <= encoded.length;
    return { bytes: keepOriginal ? bytes : encoded, extension: 'webp', contentType: 'image/webp' };
  } catch {
    throw new BadRequestException('Không đọc được ảnh này. Hãy chọn ảnh JPG, PNG hoặc WEBP khác.');
  }
}
