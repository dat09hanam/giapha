import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../database/prisma.service.js';
import {
  CONTENT_TYPE_BY_EXTENSION,
  decodeImage,
  DOCUMENT_FORMATS,
  STORED_FILE_NAME,
} from './image-format.js';

import type { UploadFamilyMediaDto } from './dto/upload-family-media.dto.js';
import type { UploadedMediaResponse } from './media.types.js';

/** Avatars only; keeping this small also keeps the JSON request body small. */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

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
    return this.storeImage(familyId, input.contentType, input.data, MAX_IMAGE_BYTES);
  }

  /** Decodes, checks and writes one image (or, with allowPdf, a PDF) under the family's folder. */
  async storeImage(
    familyId: string,
    contentType: string,
    data: string,
    maxBytes: number,
    allowPdf = false,
  ): Promise<UploadedMediaResponse & { sizeBytes: number }> {
    const { bytes, extension } = allowPdf
      ? decodeImage(contentType, data, maxBytes, DOCUMENT_FORMATS)
      : decodeImage(contentType, data, maxBytes);

    const fileName = `${randomUUID()}.${extension}`;
    const directory = this.familyDirectory(familyId);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, fileName), bytes);

    return { fileName, url: `${MEDIA_URL_PREFIX}${fileName}`, sizeBytes: bytes.length };
  }

  /**
   * Removes files whose only owner is gone, such as a deleted feed post's
   * photos. Best effort: a file that cannot be removed is left behind.
   */
  async removeOwnedFiles(familyId: string, urls: readonly string[]): Promise<void> {
    await Promise.all(
      urls.map(async (url) => {
        const fileName = url.startsWith(MEDIA_URL_PREFIX) ? url.slice(MEDIA_URL_PREFIX.length) : '';
        if (!STORED_FILE_NAME.test(fileName)) return;
        await rm(join(this.familyDirectory(familyId), fileName), { force: true }).catch(
          () => undefined,
        );
      }),
    );
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

    const url = `${MEDIA_URL_PREFIX}${fileName}`;
    const [avatarUses, feedUses, libraryUses] = await Promise.all([
      this.prisma.person.count({ where: { familyId, avatarUrl: url } }),
      this.prisma.feedImage.count({ where: { familyId, url } }),
      this.prisma.media.count({ where: { familyId, OR: [{ fileUrl: url }, { thumbUrl: url }] } }),
    ]);
    if (feedUses > 0) {
      throw new ConflictException('Ảnh này đang nằm trong một bài viết trên bảng tin.');
    }
    if (libraryUses > 0) {
      throw new ConflictException('Tệp này đang nằm trong album hoặc tư liệu của dòng họ.');
    }
    if (avatarUses > 0) {
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
