import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PosterBackgroundMode, type PosterDecorationKind, type Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service.js';
import { CONTENT_TYPE_BY_EXTENSION, decodeImage, STORED_FILE_NAME } from '../media/image-format.js';
import type {
  CreatePosterDecorationDto,
  PosterDecorationImageDto,
  PosterInsetsDto,
  PosterNameAreaDto,
  PosterVerticalTextAreaDto,
  UpdatePosterDecorationDto,
} from './dto/poster-decoration.dto.js';
import {
  posterDecorationSelect,
  toPosterDecorationResponse,
  type AdminPosterDecorationResponse,
  type PosterDecorationResponse,
} from './poster-decoration.types.js';

/** Decorations are drawn large on the poster, so they get more room than avatars. */
const MAX_DECORATION_BYTES = 4 * 1024 * 1024;
const DECORATION_FOLDER = 'poster-decorations';

const NOT_FOUND = 'Không tìm thấy hình nền.';

type InsetFields = Pick<
  Prisma.PosterDecorationUncheckedCreateInput,
  'insetTop' | 'insetRight' | 'insetBottom' | 'insetLeft'
>;

/** Whether two edges in tenths of a percent add up past `limit`, ignoring float noise. */
function sumOver(a: number, b: number, limit: number): boolean {
  return Math.round((a + b) * 10) > limit * 10;
}

/** Opposite edges together must leave at least this much of the art free. */
const MIN_FREE_PERCENT = 20;

function insetFields(insets: PosterInsetsDto | null | undefined): InsetFields {
  if (insets === undefined) return {};
  if (insets === null) {
    return { insetTop: null, insetRight: null, insetBottom: null, insetLeft: null };
  }
  if (
    sumOver(insets.top, insets.bottom, 100 - MIN_FREE_PERCENT) ||
    sumOver(insets.left, insets.right, 100 - MIN_FREE_PERCENT)
  ) {
    throw new BadRequestException(
      `Lề hai cạnh đối diện cộng lại không được vượt quá ${100 - MIN_FREE_PERCENT}%.`,
    );
  }
  return {
    insetTop: insets.top,
    insetRight: insets.right,
    insetBottom: insets.bottom,
    insetLeft: insets.left,
  };
}

type NameFields = Pick<
  Prisma.PosterDecorationUncheckedCreateInput,
  | 'nameInsetTop'
  | 'nameInsetRight'
  | 'nameInsetBottom'
  | 'nameInsetLeft'
  | 'nameCurve'
  | 'nameColor'
>;

/** The name area may be a thin band, but opposite edges must still leave this much free. */
const MIN_NAME_PERCENT = 5;

function nameFields(area: PosterNameAreaDto | null | undefined): NameFields {
  if (area === undefined) return {};
  if (area === null) {
    return { nameInsetTop: null, nameInsetRight: null, nameInsetBottom: null, nameInsetLeft: null };
  }
  if (
    sumOver(area.top, area.bottom, 100 - MIN_NAME_PERCENT) ||
    sumOver(area.left, area.right, 100 - MIN_NAME_PERCENT)
  ) {
    throw new BadRequestException(
      `Vùng tên dòng họ phải rộng và cao ít nhất ${MIN_NAME_PERCENT}% ảnh.`,
    );
  }
  return {
    nameInsetTop: area.top,
    nameInsetRight: area.right,
    nameInsetBottom: area.bottom,
    nameInsetLeft: area.left,
    nameCurve: area.curve,
    nameColor: area.color.toLowerCase(),
  };
}

function validateVerticalTextArea(area: PosterVerticalTextAreaDto, label: string): void {
  if (
    sumOver(area.top, area.bottom, 100 - MIN_NAME_PERCENT) ||
    sumOver(area.left, area.right, 100 - MIN_NAME_PERCENT)
  ) {
    throw new BadRequestException(`${label} phải rộng và cao ít nhất ${MIN_NAME_PERCENT}% ảnh.`);
  }
}

type LeftTextFields = Pick<
  Prisma.PosterDecorationUncheckedCreateInput,
  | 'leftTextInsetTop'
  | 'leftTextInsetRight'
  | 'leftTextInsetBottom'
  | 'leftTextInsetLeft'
  | 'leftTextColor'
>;

function leftTextFields(area: PosterVerticalTextAreaDto | null | undefined): LeftTextFields {
  if (area === undefined) return {};
  if (area === null) {
    return {
      leftTextInsetTop: null,
      leftTextInsetRight: null,
      leftTextInsetBottom: null,
      leftTextInsetLeft: null,
    };
  }
  validateVerticalTextArea(area, 'Vùng chữ dọc bên trái');
  return {
    leftTextInsetTop: area.top,
    leftTextInsetRight: area.right,
    leftTextInsetBottom: area.bottom,
    leftTextInsetLeft: area.left,
    leftTextColor: area.color.toLowerCase(),
  };
}

type RightTextFields = Pick<
  Prisma.PosterDecorationUncheckedCreateInput,
  | 'rightTextInsetTop'
  | 'rightTextInsetRight'
  | 'rightTextInsetBottom'
  | 'rightTextInsetLeft'
  | 'rightTextColor'
>;

function rightTextFields(area: PosterVerticalTextAreaDto | null | undefined): RightTextFields {
  if (area === undefined) return {};
  if (area === null) {
    return {
      rightTextInsetTop: null,
      rightTextInsetRight: null,
      rightTextInsetBottom: null,
      rightTextInsetLeft: null,
    };
  }
  validateVerticalTextArea(area, 'Vùng chữ dọc bên phải');
  return {
    rightTextInsetTop: area.top,
    rightTextInsetRight: area.right,
    rightTextInsetBottom: area.bottom,
    rightTextInsetLeft: area.left,
    rightTextColor: area.color.toLowerCase(),
  };
}

type ImageFields = Pick<Prisma.PosterDecorationUncheckedCreateInput, 'backgroundMode'> &
  InsetFields &
  NameFields &
  LeftTextFields &
  RightTextFields;

/** Drawing options of an uploaded background; built-in ones are drawn by fixed code. */
function imageFields(
  input: {
    backgroundMode?: PosterBackgroundMode;
    insets?: PosterInsetsDto | null;
    nameArea?: PosterNameAreaDto | null;
    leftTextArea?: PosterVerticalTextAreaDto | null;
    rightTextArea?: PosterVerticalTextAreaDto | null;
  },
  isCreate: boolean,
): ImageFields {
  return {
    ...insetFields(input.insets),
    ...nameFields(input.nameArea),
    ...leftTextFields(input.leftTextArea),
    ...rightTextFields(input.rightTextArea),
    // Uploaded sheets usually include their own frame, so they stretch to the edges by default.
    ...(input.backgroundMode !== undefined || isCreate
      ? { backgroundMode: input.backgroundMode ?? PosterBackgroundMode.STRETCH }
      : {}),
  };
}

/**
 * The platform-wide phả đồ decoration library. Built-in rows are drawn by the
 * web app and can be renamed, reordered or hidden but never deleted; uploaded
 * rows carry their own image.
 */
@Injectable()
export class PosterDecorationsService {
  private readonly directory: string;

  constructor(
    @Inject(ConfigService) config: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {
    this.directory = join(resolve(config.getOrThrow<string>('MEDIA_ROOT')), DECORATION_FOLDER);
  }

  async listActive(): Promise<PosterDecorationResponse[]> {
    const records = await this.prisma.posterDecoration.findMany({
      where: { isActive: true },
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      select: posterDecorationSelect,
    });
    return records.map(toPosterDecorationResponse);
  }

  async listAll(): Promise<AdminPosterDecorationResponse[]> {
    const records = await this.prisma.posterDecoration.findMany({
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        ...posterDecorationSelect,
        _count: {
          select: { backgroundsOf: true },
        },
      },
    });
    return records.map(({ _count, ...record }) => ({
      ...toPosterDecorationResponse(record),
      usageCount: _count.backgroundsOf,
    }));
  }

  async create(input: CreatePosterDecorationDto): Promise<PosterDecorationResponse> {
    const imageFile = await this.storeImage(input.image);
    try {
      const record = await this.prisma.posterDecoration.create({
        data: {
          kind: input.kind,
          name: input.name.trim(),
          imageFile,
          isActive: input.isActive ?? true,
          sortOrder: input.sortOrder ?? (await this.nextSortOrder(input.kind)),
          ...imageFields(input, true),
        },
        select: posterDecorationSelect,
      });
      return toPosterDecorationResponse(record);
    } catch (error: unknown) {
      await this.removeImage(imageFile);
      throw error;
    }
  }

  async update(id: string, input: UpdatePosterDecorationDto): Promise<PosterDecorationResponse> {
    const existing = await this.prisma.posterDecoration.findUnique({
      where: { id },
      select: { kind: true, imageFile: true },
    });
    if (!existing) throw new NotFoundException(NOT_FOUND);

    const imageFile = input.image ? await this.storeImage(input.image) : undefined;
    try {
      const record = await this.prisma.posterDecoration.update({
        where: { id },
        data: {
          ...(input.name === undefined ? {} : { name: input.name.trim() }),
          ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
          ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
          ...(imageFile === undefined ? {} : { imageFile }),
          ...imageFields(input, false),
        },
        select: posterDecorationSelect,
      });
      if (imageFile && existing.imageFile) await this.removeImage(existing.imageFile);
      return toPosterDecorationResponse(record);
    } catch (error: unknown) {
      if (imageFile) await this.removeImage(imageFile);
      throw error;
    }
  }

  /** Families showing a deleted decoration simply stop showing it (foreign key SET NULL). */
  async remove(id: string): Promise<void> {
    const existing = await this.prisma.posterDecoration.findUnique({
      where: { id },
      select: { imageFile: true },
    });
    if (!existing) throw new NotFoundException(NOT_FOUND);

    await this.prisma.posterDecoration.delete({ where: { id } });
    if (existing.imageFile) await this.removeImage(existing.imageFile);
  }

  async readImage(id: string): Promise<{ bytes: Buffer; contentType: string }> {
    const record = await this.prisma.posterDecoration.findUnique({
      where: { id },
      select: { imageFile: true },
    });
    const fileName = record?.imageFile;
    if (!fileName || !STORED_FILE_NAME.test(fileName)) throw new NotFoundException(NOT_FOUND);

    const contentType = CONTENT_TYPE_BY_EXTENSION[fileName.split('.').pop() ?? ''];
    if (!contentType) throw new NotFoundException(NOT_FOUND);
    try {
      return { bytes: await readFile(join(this.directory, fileName)), contentType };
    } catch {
      throw new NotFoundException(NOT_FOUND);
    }
  }

  private async nextSortOrder(kind: PosterDecorationKind): Promise<number> {
    const last = await this.prisma.posterDecoration.aggregate({
      where: { kind },
      _max: { sortOrder: true },
    });
    return (last._max.sortOrder ?? 0) + 1;
  }

  private async storeImage(image: PosterDecorationImageDto): Promise<string> {
    const { bytes, extension } = decodeImage(image.contentType, image.data, MAX_DECORATION_BYTES);
    const fileName = `${randomUUID()}.${extension}`;
    await mkdir(this.directory, { recursive: true });
    await writeFile(join(this.directory, fileName), bytes);
    return fileName;
  }

  private async removeImage(fileName: string): Promise<void> {
    if (!STORED_FILE_NAME.test(fileName)) return;
    // force: an already-missing file is the outcome the caller wanted.
    await rm(join(this.directory, fileName), { force: true });
  }
}
