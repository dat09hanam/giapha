import { BadRequestException } from '@nestjs/common';

type ImageFormat = {
  extension: string;
  /** Verified against the decoded bytes so a mislabelled upload is rejected. */
  matches: (bytes: Buffer) => boolean;
};

/** Raster formats only: SVG is excluded because it can carry script. */
const IMAGE_FORMATS: Record<string, ImageFormat> = {
  'image/jpeg': {
    extension: 'jpg',
    matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  'image/png': {
    extension: 'png',
    matches: (bytes) =>
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/webp': {
    extension: 'webp',
    matches: (bytes) =>
      bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP',
  },
};

export const IMAGE_CONTENT_TYPES = Object.keys(IMAGE_FORMATS);

/** Library documents may also be PDFs, such as a scanned genealogy book. */
export const DOCUMENT_FORMATS: Record<string, ImageFormat> = {
  ...IMAGE_FORMATS,
  'application/pdf': {
    extension: 'pdf',
    matches: (bytes) => bytes.subarray(0, 5).toString('ascii') === '%PDF-',
  },
};

export const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

/** Server-generated names only: `<uuid>.<extension>`, never anything from the client. */
export const STORED_FILE_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/;

/** Decodes a base64 upload and checks its size and real format; images unless told otherwise. */
export function decodeImage(
  contentType: string,
  data: string,
  maxBytes: number,
  formats: Record<string, ImageFormat> = IMAGE_FORMATS,
): { bytes: Buffer; extension: string } {
  const format = formats[contentType];
  if (!format) {
    throw new BadRequestException(
      formats === IMAGE_FORMATS
        ? 'Định dạng ảnh không được hỗ trợ. Hãy dùng JPG, PNG hoặc WEBP.'
        : 'Định dạng tệp không được hỗ trợ. Hãy dùng ảnh JPG, PNG, WEBP hoặc tệp PDF.',
    );
  }

  const bytes = Buffer.from(data, 'base64');
  if (bytes.length === 0) {
    throw new BadRequestException('Tệp ảnh rỗng hoặc không đọc được.');
  }
  if (bytes.length > maxBytes) {
    throw new BadRequestException(
      `Ảnh vượt quá dung lượng tối đa ${Math.round(maxBytes / 1024 / 1024)} MB.`,
    );
  }
  if (!format.matches(bytes)) {
    throw new BadRequestException('Nội dung tệp không khớp với định dạng đã khai báo.');
  }

  return { bytes, extension: format.extension };
}
