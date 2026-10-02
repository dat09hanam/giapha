import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../database/prisma.service.js';
import { CONTENT_TYPE_BY_EXTENSION, decodeImage, STORED_FILE_NAME } from './image-format.js';

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
    const { bytes, extension } = decodeImage(input.contentType, input.data, MAX_IMAGE_BYTES);

    const fileName = `${randomUUID()}.${extension}`;
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
