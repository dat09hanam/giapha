import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../database/prisma.service.js';

import type { UploadFamilyMediaDto } from './dto/upload-family-media.dto.js';
import type { UploadedMediaResponse } from './media.types.js';

/** Avatars only; keeping this small also keeps the JSON request body small. */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type ImageFormat = {
  extension: string;
  /** Verified against the decoded bytes so a mislabelled upload is rejected. */
  matches: (bytes: Buffer) => boolean;
};

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

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Server-generated names only: `<uuid>.<extension>`, never anything from the client. */
const STORED_FILE_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

const MEDIA_URL_PREFIX = '/media/';

@Injectable()
export class MediaService {
  private readonly root: string;

  constructor(
    @Inject(ConfigService) config: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {
    this.root = resolve(config.getOrThrow<string>('MEDIA_ROOT'));
  }

  async saveImage(familyId: string, input: UploadFamilyMediaDto): Promise<UploadedMediaResponse> {
    const format = IMAGE_FORMATS[input.contentType];
    if (!format) {
      throw new BadRequestException(
        'Định dạng ảnh không được hỗ trợ. Hãy dùng JPG, PNG hoặc WEBP.',
      );
    }

    const bytes = Buffer.from(input.data, 'base64');
    if (bytes.length === 0) {
      throw new BadRequestException('Tệp ảnh rỗng hoặc không đọc được.');
    }
    if (bytes.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Ảnh vượt quá dung lượng tối đa 2 MB.');
    }
    if (!format.matches(bytes)) {
      throw new BadRequestException('Nội dung tệp không khớp với định dạng ảnh đã khai báo.');
    }

    const fileName = `${randomUUID()}.${format.extension}`;
    const directory = this.familyDirectory(familyId);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, fileName), bytes);

    return { fileName, url: `${MEDIA_URL_PREFIX}${fileName}` };
  }

  async readImage(
    familyId: string,
    fileName: string,
  ): Promise<{ bytes: Buffer; contentType: string }> {
    if (!STORED_FILE_NAME.test(fileName)) {
      throw new NotFoundException('Không tìm thấy tệp ảnh.');
    }

    const extension = fileName.split('.').pop() ?? '';
    const contentType = CONTENT_TYPE_BY_EXTENSION[extension];
    if (!contentType) throw new NotFoundException('Không tìm thấy tệp ảnh.');

    try {
      const bytes = await readFile(join(this.familyDirectory(familyId), fileName));
      return { bytes, contentType };
    } catch {
      throw new NotFoundException('Không tìm thấy tệp ảnh.');
    }
  }

  /**
   * Removes an upload once nothing points at it. The reference check lives here
   * rather than in the caller so a stale client can never orphan a live avatar.
   */
  async deleteImage(familyId: string, fileName: string): Promise<void> {
    if (!STORED_FILE_NAME.test(fileName)) {
      throw new NotFoundException('Không tìm thấy tệp ảnh.');
    }

    const stillUsed = await this.prisma.person.count({
      where: { familyId, avatarUrl: `${MEDIA_URL_PREFIX}${fileName}` },
    });
    if (stillUsed > 0) {
      throw new ConflictException(
        'Ảnh này vẫn đang được dùng làm ảnh đại diện đã lưu. Hãy lưu thay đổi trước khi xóa tệp.',
      );
    }

    // force: an already-missing file is the outcome the caller wanted.
    await rm(join(this.familyDirectory(familyId), fileName), { force: true });
  }

  /** Files are grouped per family so one tenant can never read another tenant's directory. */
  private familyDirectory(familyId: string): string {
    return join(this.root, familyId);
  }
}
