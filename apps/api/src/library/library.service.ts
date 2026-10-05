import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MediaKind, type Prisma } from '@prisma/client';

import { formatCalendarDay, parseCalendarDay } from '../common/validation/calendar-day.js';
import { PrismaService } from '../database/prisma.service.js';
import { MediaService } from '../media/media.service.js';
import {
  MAX_DOCUMENT_BYTES,
  MAX_PHOTO_BYTES,
  MAX_THUMB_BYTES,
  type CreateDocumentDto,
  type SaveAlbumDto,
  type UpdateLibraryItemDto,
  type UploadPhotoDto,
} from './library.dto.js';

const ITEM_SELECT = {
  id: true,
  kind: true,
  albumId: true,
  fileUrl: true,
  thumbUrl: true,
  contentType: true,
  sizeBytes: true,
  width: true,
  height: true,
  title: true,
  description: true,
  takenOn: true,
  createdAt: true,
  person: { select: { id: true, name: true, honorific: true } },
} satisfies Prisma.MediaSelect;

type ItemRecord = Prisma.MediaGetPayload<{ select: typeof ITEM_SELECT }>;

export type LibraryItemResponse = {
  id: string;
  kind: MediaKind;
  albumId: string | null;
  url: string;
  thumbUrl: string | null;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  title: string | null;
  description: string | null;
  takenOn: string | null;
  createdAt: string;
  person: { id: string; name: string; honorific: string | null } | null;
};

export type AlbumSummaryResponse = {
  id: string;
  title: string;
  description: string | null;
  photoCount: number;
  cover: { url: string; width: number | null; height: number | null } | null;
  createdAt: string;
  updatedAt: string;
};

export type LibraryOverviewResponse = {
  albums: AlbumSummaryResponse[];
  documents: LibraryItemResponse[];
  /** Whether this viewer is the clan head, who keeps the library. */
  canManage: boolean;
};

export type AlbumDetailResponse = {
  album: AlbumSummaryResponse;
  photos: LibraryItemResponse[];
  canManage: boolean;
};

/** Only live items: deletedAt is legacy and always null for library rows. */
const LIVE = { deletedAt: null } as const;

function toItem(item: ItemRecord): LibraryItemResponse {
  return {
    id: item.id,
    kind: item.kind,
    albumId: item.albumId,
    url: item.fileUrl,
    thumbUrl: item.thumbUrl,
    contentType: item.contentType,
    sizeBytes: item.sizeBytes,
    width: item.width,
    height: item.height,
    title: item.title,
    description: item.description,
    takenOn: item.takenOn ? formatCalendarDay(item.takenOn) : null,
    createdAt: item.createdAt.toISOString(),
    person: item.person,
  };
}

const optionalText = (value: string | null | undefined): string | null =>
  value?.trim().replace(/[ \t]+/g, ' ') || null;

@Injectable()
export class LibraryService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  async overview(familyId: string, canManage: boolean): Promise<LibraryOverviewResponse> {
    const [albums, documents] = await Promise.all([
      this.prisma.album.findMany({
        where: { familyId },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.media.findMany({
        where: { familyId, kind: MediaKind.DOCUMENT, ...LIVE },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: ITEM_SELECT,
      }),
    ]);
    return {
      albums: await this.summaries(familyId, albums),
      documents: documents.map(toItem),
      canManage,
    };
  }

  async album(familyId: string, albumId: string, canManage: boolean): Promise<AlbumDetailResponse> {
    const album = await this.findAlbum(familyId, albumId);
    const photos = await this.prisma.media.findMany({
      where: { familyId, albumId: album.id, kind: MediaKind.PHOTO, ...LIVE },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: ITEM_SELECT,
    });
    const [summary] = await this.summaries(familyId, [album]);
    return { album: summary!, photos: photos.map(toItem), canManage };
  }

  async createAlbum(familyId: string, input: SaveAlbumDto): Promise<AlbumSummaryResponse> {
    const album = await this.prisma.album.create({ data: { familyId, ...this.albumData(input) } });
    const [summary] = await this.summaries(familyId, [album]);
    return summary!;
  }

  async updateAlbum(
    familyId: string,
    albumId: string,
    input: SaveAlbumDto,
  ): Promise<AlbumSummaryResponse> {
    const album = await this.findAlbum(familyId, albumId);
    const updated = await this.prisma.album.update({
      where: { id: album.id },
      data: this.albumData(input),
    });
    const [summary] = await this.summaries(familyId, [updated]);
    return summary!;
  }

  async deleteAlbum(familyId: string, albumId: string): Promise<void> {
    const album = await this.findAlbum(familyId, albumId);
    const photos = await this.prisma.media.findMany({
      where: { familyId, albumId: album.id },
      select: { fileUrl: true, thumbUrl: true },
    });
    // Its photos go with it (Cascade); then their files.
    await this.prisma.album.delete({ where: { id: album.id } });
    await this.media.removeOwnedFiles(familyId, photos.flatMap(fileUrlsOf));
  }

  async addPhoto(
    familyId: string,
    albumId: string,
    input: UploadPhotoDto,
  ): Promise<LibraryItemResponse> {
    const album = await this.findAlbum(familyId, albumId);
    const details = await this.itemDetails(familyId, input);
    return this.storeItem(familyId, input, MAX_PHOTO_BYTES, false, async (files) => {
      const [item] = await this.prisma.$transaction([
        this.prisma.media.create({
          data: { familyId, albumId: album.id, kind: MediaKind.PHOTO, ...files, ...details },
          select: ITEM_SELECT,
        }),
        // Recently filled albums come first.
        this.prisma.album.update({ where: { id: album.id }, data: { updatedAt: new Date() } }),
      ]);
      return item;
    });
  }

  async createDocument(familyId: string, input: CreateDocumentDto): Promise<LibraryItemResponse> {
    const details = await this.itemDetails(familyId, input);
    if (!details.title) throw new BadRequestException('Vui lòng nhập tên tư liệu.');
    return this.storeItem(familyId, input, MAX_DOCUMENT_BYTES, true, (files) =>
      this.prisma.media.create({
        data: { familyId, kind: MediaKind.DOCUMENT, ...files, ...details },
        select: ITEM_SELECT,
      }),
    );
  }

  async updateItem(
    familyId: string,
    itemId: string,
    input: UpdateLibraryItemDto,
  ): Promise<LibraryItemResponse> {
    const item = await this.findItem(familyId, itemId);
    const details = await this.itemDetails(familyId, input);
    const sent = (key: string): boolean => (input as Record<string, unknown>)[key] !== undefined;
    if (item.kind === MediaKind.DOCUMENT && sent('title') && !details.title) {
      throw new BadRequestException('Vui lòng nhập tên tư liệu.');
    }
    // Only the fields sent change; null clears one.
    const data = Object.fromEntries(
      Object.entries(details).filter(([key]) => sent(key)),
    ) as Partial<typeof details>;
    const updated = await this.prisma.media.update({
      where: { id: item.id },
      data,
      select: ITEM_SELECT,
    });
    return toItem(updated);
  }

  async deleteItem(familyId: string, itemId: string): Promise<void> {
    const item = await this.findItem(familyId, itemId);
    await this.prisma.media.delete({ where: { id: item.id } });
    await this.media.removeOwnedFiles(
      familyId,
      fileUrlsOf({ fileUrl: item.url, thumbUrl: item.thumbUrl }),
    );
  }

  /** Stores the file and its thumbnail, then the row; files are removed again if anything fails. */
  private async storeItem(
    familyId: string,
    input: UploadPhotoDto | CreateDocumentDto,
    maxBytes: number,
    allowPdf: boolean,
    save: (files: {
      fileUrl: string;
      thumbUrl: string | null;
      contentType: string;
      sizeBytes: number;
      width: number | null;
      height: number | null;
    }) => Promise<ItemRecord>,
  ): Promise<LibraryItemResponse> {
    const stored: string[] = [];
    try {
      const file = await this.media.storeImage(
        familyId,
        input.contentType,
        input.data,
        maxBytes,
        allowPdf,
      );
      stored.push(file.url);
      const thumb = input.thumbData
        ? await this.media.storeImage(familyId, 'image/jpeg', input.thumbData, MAX_THUMB_BYTES)
        : null;
      if (thumb) stored.push(thumb.url);
      const item = await save({
        fileUrl: file.url,
        thumbUrl: thumb?.url ?? null,
        contentType: input.contentType,
        sizeBytes: file.sizeBytes,
        width: input.width ?? null,
        height: input.height ?? null,
      });
      return toItem(item);
    } catch (error) {
      await this.media.removeOwnedFiles(familyId, stored);
      throw error;
    }
  }

  /** Title, description, day and person, checked; the person must belong to this family. */
  private async itemDetails(
    familyId: string,
    input: UpdateLibraryItemDto,
  ): Promise<{
    title: string | null;
    description: string | null;
    takenOn: Date | null;
    personId: string | null;
  }> {
    const personId = input.personId ?? null;
    if (personId) {
      const person = await this.prisma.person.findFirst({
        where: { id: personId, familyId },
        select: { id: true },
      });
      if (!person) throw new NotFoundException('Không tìm thấy người này trong gia phả.');
    }
    return {
      title: optionalText(input.title),
      description: input.description?.trim() || null,
      takenOn: input.takenOn ? parseCalendarDay(input.takenOn, 'Ngày không hợp lệ.') : null,
      personId,
    };
  }

  private albumData(input: SaveAlbumDto): { title: string; description: string | null } {
    const title = optionalText(input.title);
    if (!title) throw new BadRequestException('Vui lòng nhập tên album.');
    return { title, description: input.description?.trim() || null };
  }

  /** Albums with their photo count and cover (the first photo added). */
  private async summaries(
    familyId: string,
    albums: ReadonlyArray<{
      id: string;
      title: string;
      description: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ): Promise<AlbumSummaryResponse[]> {
    if (albums.length === 0) return [];
    const albumIds = albums.map((album) => album.id);
    const [counts, photos] = await Promise.all([
      this.prisma.media.groupBy({
        by: ['albumId'],
        where: { familyId, albumId: { in: albumIds }, ...LIVE },
        _count: { _all: true },
      }),
      this.prisma.media.findMany({
        where: { familyId, albumId: { in: albumIds }, ...LIVE },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { albumId: true, fileUrl: true, thumbUrl: true, width: true, height: true },
      }),
    ]);
    const coverOf = new Map<string, (typeof photos)[number]>();
    for (const photo of photos) {
      if (photo.albumId && !coverOf.has(photo.albumId)) coverOf.set(photo.albumId, photo);
    }
    return albums.map((album) => {
      const cover = coverOf.get(album.id);
      return {
        id: album.id,
        title: album.title,
        description: album.description,
        photoCount: counts.find((row) => row.albumId === album.id)?._count._all ?? 0,
        cover: cover
          ? { url: cover.thumbUrl ?? cover.fileUrl, width: cover.width, height: cover.height }
          : null,
        createdAt: album.createdAt.toISOString(),
        updatedAt: album.updatedAt.toISOString(),
      };
    });
  }

  private async findAlbum(familyId: string, albumId: string) {
    const album = await this.prisma.album.findFirst({ where: { id: albumId, familyId } });
    if (!album) throw new NotFoundException('Không tìm thấy album này.');
    return album;
  }

  private async findItem(familyId: string, itemId: string): Promise<LibraryItemResponse> {
    const item = await this.prisma.media.findFirst({
      where: { id: itemId, familyId, ...LIVE },
      select: ITEM_SELECT,
    });
    if (!item) throw new NotFoundException('Không tìm thấy ảnh hoặc tư liệu này.');
    return toItem(item);
  }
}

function fileUrlsOf(item: { fileUrl: string; thumbUrl: string | null }): string[] {
  return item.thumbUrl ? [item.fileUrl, item.thumbUrl] : [item.fileUrl];
}
