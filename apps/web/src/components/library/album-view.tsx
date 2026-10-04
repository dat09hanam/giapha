'use client';

import { ArrowLeft, ImagePlus, LoaderCircle, PencilLine, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { ItemEditDialog, LibraryLightbox } from '@/components/library/item-details';
import { Button } from '@/components/ui/button';
import { Presence } from '@/components/ui/presence';
import { SheetDialog } from '@/components/ui/sheet-dialog';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { compressImage, makeThumbnail } from '@/lib/image-compress';
import {
  deleteAlbum,
  deleteLibraryItem,
  MAX_PHOTO_BYTES,
  updateAlbum,
  uploadAlbumPhoto,
  type AlbumDetail,
  type AlbumSummary,
  type LibraryItem,
} from '@/lib/library-api';
import { familyMediaSrc } from '@/lib/media-api';
import { searchEntriesFromPeople } from '@/lib/person-search';
import type { Person } from '@/types/family-tree';

const inputClass =
  'w-full rounded-xl border border-stone-200 bg-white px-3 text-base outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 sm:text-sm';

function EditAlbumDialog({
  familySlug,
  album,
  onClose,
  onSaved,
}: {
  familySlug: string;
  album: AlbumSummary;
  onClose: () => void;
  onSaved: (album: AlbumSummary) => void;
}) {
  const showToast = useToast();
  const [title, setTitle] = useState(album.title);
  const [description, setDescription] = useState(album.description ?? '');
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    setSaving(true);
    try {
      onSaved(
        await updateAlbum(familySlug, album.id, {
          title: title.trim(),
          description: description.trim() || null,
        }),
      );
      onClose();
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'sửa album') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SheetDialog
      title="Sửa album"
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving || !title.trim()}>
            {saving ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </>
      }
    >
      <label className="grid gap-1.5" htmlFor="edit-album-title">
        <span className="text-sm font-medium text-stone-700">Tên album</span>
        <input
          id="edit-album-title"
          className={`${inputClass} h-11`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={191}
        />
      </label>
      <label className="grid gap-1.5" htmlFor="edit-album-description">
        <span className="text-sm font-medium text-stone-700">
          Mô tả <span className="font-normal text-stone-400">(không bắt buộc)</span>
        </span>
        <textarea
          id="edit-album-description"
          className={`${inputClass} field-sizing-content min-h-20 resize-none py-2.5 leading-6`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={5000}
          rows={3}
        />
      </label>
    </SheetDialog>
  );
}

/** One album: its photos in a grid, full screen on tap; the clan head adds and manages them. */
export function AlbumView({
  familySlug,
  initial,
  people,
}: {
  familySlug: string;
  initial: AlbumDetail;
  /** The tree's people, for tagging photos; empty for members, who cannot edit. */
  people: Person[];
}) {
  const router = useRouter();
  const showToast = useToast();
  const [album, setAlbum] = useState(initial.album);
  const [photos, setPhotos] = useState(initial.photos);
  const [upload, setUpload] = useState<{ done: number; total: number; failed: number } | null>(
    null,
  );
  const [viewing, setViewing] = useState<number | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<LibraryItem | null>(null);
  const [editingAlbum, setEditingAlbum] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canManage = initial.canManage;
  const entries = useMemo(() => searchEntriesFromPeople(people), [people]);
  const libraryHref = `/${encodeURIComponent(familySlug)}/tu-lieu`;

  /** One photo at a time, so each request stays small and one failure does not stop the rest. */
  async function addPhotos(files: File[]): Promise<void> {
    if (files.length === 0) return;
    setUpload({ done: 0, total: files.length, failed: 0 });
    let failed = 0;
    for (const [index, file] of files.entries()) {
      try {
        const image = await compressImage(file, MAX_PHOTO_BYTES, { maxEdge: 2048 });
        URL.revokeObjectURL(image.previewUrl);
        const created = await uploadAlbumPhoto(familySlug, album.id, {
          contentType: image.contentType,
          data: image.data,
          width: image.width,
          height: image.height,
          thumbData: await makeThumbnail(file),
        });
        setPhotos((current) => [...current, created]);
      } catch {
        failed += 1;
      }
      setUpload({ done: index + 1, total: files.length, failed });
    }
    setUpload(null);
    setAlbum((current) => ({ ...current, photoCount: current.photoCount + files.length - failed }));
    showToast(
      failed > 0
        ? {
            kind: 'error',
            message: `Không tải lên được ${failed} trên ${files.length} ảnh. Hãy thử lại.`,
          }
        : { kind: 'success', message: `Đã thêm ${files.length} ảnh vào album.` },
    );
  }

  async function removePhoto(item: LibraryItem): Promise<void> {
    if (!window.confirm('Xóa ảnh này khỏi album? Ảnh sẽ bị xóa vĩnh viễn.')) return;
    try {
      await deleteLibraryItem(familySlug, item.id);
      const remaining = photos.filter((entry) => entry.id !== item.id);
      setPhotos(remaining);
      if (remaining.length === 0) setViewing(null);
      setAlbum((current) => ({ ...current, photoCount: Math.max(0, current.photoCount - 1) }));
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'xóa ảnh') });
    }
  }

  async function removeAlbum(): Promise<void> {
    const warning =
      photos.length > 0
        ? `Xóa album “${album.title}” cùng ${photos.length} ảnh? Ảnh sẽ bị xóa vĩnh viễn.`
        : `Xóa album “${album.title}”?`;
    if (!window.confirm(warning)) return;
    try {
      await deleteAlbum(familySlug, album.id);
      router.push(libraryHref);
      router.refresh();
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'xóa album') });
    }
  }

  const uploading = upload !== null;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-2 pb-6 sm:gap-4 sm:px-4 sm:py-6">
      <header className="grid gap-3 bg-white px-4 py-3 shadow-sm sm:rounded-2xl sm:border sm:border-stone-200">
        <Link
          href={libraryHref}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-emerald-800 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Album và tư liệu
        </Link>
        <div>
          <h1 className="text-xl font-bold leading-snug text-emerald-950 sm:text-2xl">
            {album.title}
          </h1>
          <p className="text-sm text-stone-500">{album.photoCount} ảnh</p>
          {album.description ? (
            <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-stone-700">
              {album.description}
            </p>
          ) : null}
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus className="size-4" aria-hidden="true" />
              )}
              Thêm ảnh
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingAlbum(true)}
              disabled={uploading}
            >
              <PencilLine className="size-4" aria-hidden="true" />
              Sửa
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-red-700 hover:bg-red-50"
              onClick={() => void removeAlbum()}
              disabled={uploading}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Xóa album
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = '';
                void addPhotos(files);
              }}
            />
          </div>
        ) : null}
        {upload ? (
          <div className="grid gap-1.5" role="status" aria-live="polite">
            <p className="text-sm text-stone-600">
              Đang tải ảnh lên {upload.done}/{upload.total}…
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-emerald-600 transition-[width] duration-300"
                style={{ width: `${Math.round((upload.done / upload.total) * 100)}%` }}
              />
            </div>
          </div>
        ) : null}
      </header>

      {photos.length === 0 ? (
        <div className="grid justify-items-center gap-3 bg-white px-6 py-14 text-center text-sm text-stone-500 shadow-sm sm:rounded-2xl">
          <span className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <ImagePlus className="size-7" aria-hidden="true" />
          </span>
          {canManage
            ? 'Album còn trống. Bấm “Thêm ảnh” để chọn nhiều ảnh một lúc.'
            : 'Album chưa có ảnh nào.'}
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-0.5 sm:grid-cols-4 sm:gap-1.5 lg:grid-cols-5">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setViewing(index)}
                className="ui-backdrop block aspect-square w-full overflow-hidden bg-stone-200 sm:rounded-lg"
                aria-label={photo.title ?? `Ảnh ${index + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={familyMediaSrc(familySlug, photo.thumbUrl ?? photo.url)}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition duration-300 hover:scale-105"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Presence>
        {viewing !== null && photos.length > 0 ? (
          <LibraryLightbox
            items={photos}
            familySlug={familySlug}
            startIndex={viewing}
            canManage={canManage}
            onClose={() => setViewing(null)}
            onEdit={(item) => {
              setViewing(null);
              setEditingPhoto(item);
            }}
            onDelete={(item) => void removePhoto(item)}
          />
        ) : null}
      </Presence>
      <Presence>
        {editingPhoto ? (
          <ItemEditDialog
            familySlug={familySlug}
            item={editingPhoto}
            people={entries}
            onClose={() => setEditingPhoto(null)}
            onSaved={(item) =>
              setPhotos((current) => current.map((entry) => (entry.id === item.id ? item : entry)))
            }
          />
        ) : null}
      </Presence>
      <Presence>
        {editingAlbum ? (
          <EditAlbumDialog
            familySlug={familySlug}
            album={album}
            onClose={() => setEditingAlbum(false)}
            onSaved={setAlbum}
          />
        ) : null}
      </Presence>
    </div>
  );
}
