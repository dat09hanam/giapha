'use client';

import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FolderPen,
  FolderX,
  ImagePlus,
  Hourglass,
  PencilLine,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { InlineLoader } from '@/components/ui/heritage-loader';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ItemEditDialog, itemMeta } from '@/components/library/item-details';
import { Button } from '@/components/ui/button';
import { Presence } from '@/components/ui/presence';
import { SheetDialog } from '@/components/ui/sheet-dialog';
import { useToast } from '@/components/ui/toast';
import { ZoomableImage } from '@/components/ui/zoomable-image';
import { getApiErrorMessage } from '@/lib/api-error';
import { compressImage, makeThumbnail } from '@/lib/image-compress';
import {
  approveLibraryPhoto,
  deleteAlbum,
  deleteLibraryItem,
  MAX_PHOTO_BYTES,
  updateAlbum,
  uploadAlbumPhoto,
  type AlbumDetail,
  type AlbumSummary,
  type LibraryItem,
} from '@/lib/library-api';
import { downloadFamilyMedia, familyMediaSrc } from '@/lib/media-api';
import { searchEntriesFromPeople } from '@/lib/person-search';
import { cn } from '@/lib/utils';
import type { Person } from '@/types/family-tree';

const inputClass =
  'w-full rounded-xl border border-stone-200 bg-white px-3 text-base outline-none transition placeholder:text-stone-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm';

/** One of the clan head's tools under the viewer: an icon over a short label. */
function ToolButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  danger = false,
  spin = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  spin?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex min-w-16 flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition disabled:opacity-40',
        danger ? 'text-red-300 hover:bg-red-500/15' : 'text-white/80 hover:bg-white/10',
      )}
    >
      {spin ? <InlineLoader className="size-5" /> : <Icon className="size-5" aria-hidden="true" />}
      {label}
    </button>
  );
}

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

/**
 * One album as a photo viewer: the photo large, a strip of thumbnails to move between them, and
 * a download button. The clan head adds and manages photos from a row of tools underneath.
 */
/**
 * Photos members sent into the album. The clan head approves or turns each
 * one down; a member sees only their own and may withdraw them.
 */
function PendingPhotosDialog({
  familySlug,
  photos,
  canManage,
  busyId,
  onApprove,
  onApproveAll,
  onRemove,
  onClose,
}: {
  familySlug: string;
  photos: LibraryItem[];
  canManage: boolean;
  busyId: string | null;
  onApprove: (item: LibraryItem) => void;
  onApproveAll: () => void;
  onRemove: (item: LibraryItem) => void;
  onClose: () => void;
}) {
  return (
    <SheetDialog
      title={canManage ? 'Ảnh chờ duyệt' : 'Ảnh bạn đã gửi'}
      onClose={onClose}
      footer={
        canManage && photos.length > 1 ? (
          <Button type="button" onClick={onApproveAll} disabled={busyId !== null}>
            <Check className="size-4" aria-hidden="true" />
            Duyệt tất cả ({photos.length})
          </Button>
        ) : undefined
      }
    >
      <p className="text-sm leading-6 text-stone-600">
        {canManage
          ? 'Thành viên gửi các ảnh này vào album. Ảnh chỉ hiện cho mọi người sau khi bạn duyệt.'
          : 'Các ảnh này sẽ hiện trong album sau khi trưởng họ duyệt.'}
      </p>
      {photos.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-500">Không còn ảnh nào chờ duyệt.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => {
            const busy = busyId === photo.id;
            return (
              <li
                key={photo.id}
                className="overflow-hidden rounded-xl border border-gold-500/25 bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={familyMediaSrc(familySlug, photo.thumbUrl ?? photo.url)}
                  alt={photo.title ?? 'Ảnh chờ duyệt'}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
                <div className="grid gap-2 p-2">
                  {canManage && photo.uploadedBy ? (
                    <p className="truncate text-xs text-stone-500" title={photo.uploadedBy}>
                      Gửi bởi <span className="font-medium text-stone-700">{photo.uploadedBy}</span>
                    </p>
                  ) : null}
                  {canManage ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId !== null}
                        onClick={() => onRemove(photo)}
                        aria-label="Từ chối ảnh này"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyId !== null}
                        onClick={() => onApprove(photo)}
                      >
                        {busy ? (
                          <InlineLoader className="size-4" />
                        ) : (
                          <Check className="size-4" aria-hidden="true" />
                        )}
                        Duyệt
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId !== null}
                      onClick={() => onRemove(photo)}
                    >
                      {busy ? <InlineLoader className="size-4" /> : null}
                      Rút lại
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SheetDialog>
  );
}

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
  const confirm = useConfirm();
  const router = useRouter();
  const showToast = useToast();
  const [album, setAlbum] = useState(initial.album);
  const [photos, setPhotos] = useState(initial.photos);
  const [pendingPhotos, setPendingPhotos] = useState(initial.pendingPhotos);
  const [reviewing, setReviewing] = useState(false);
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [upload, setUpload] = useState<{ done: number; total: number; failed: number } | null>(
    null,
  );
  const [current, setCurrent] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const thumbRefs = useRef(new Map<number, HTMLButtonElement>());
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
        if (created.pending) setPendingPhotos((current) => [...current, created]);
        else setPhotos((current) => [...current, created]);
      } catch {
        failed += 1;
      }
      setUpload({ done: index + 1, total: files.length, failed });
    }
    setUpload(null);
    if (canManage) {
      setAlbum((current) => ({
        ...current,
        photoCount: current.photoCount + files.length - failed,
      }));
    }
    showToast(
      failed > 0
        ? {
            kind: 'error',
            message: `Không tải lên được ${failed} trên ${files.length} ảnh. Hãy thử lại.`,
          }
        : canManage
          ? { kind: 'success', message: `Đã thêm ${files.length} ảnh vào album.` }
          : {
              kind: 'success',
              message: `Đã gửi ${files.length} ảnh. Ảnh sẽ hiện trong album sau khi trưởng họ duyệt.`,
            },
    );
  }

  async function approve(item: LibraryItem): Promise<boolean> {
    setReviewBusyId(item.id);
    try {
      const approved = await approveLibraryPhoto(familySlug, item.id);
      setPendingPhotos((current) => current.filter((entry) => entry.id !== item.id));
      setPhotos((current) => [...current, approved]);
      setAlbum((current) => ({ ...current, photoCount: current.photoCount + 1 }));
      return true;
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'duyệt ảnh') });
      return false;
    } finally {
      setReviewBusyId(null);
    }
  }

  async function approveAll(): Promise<void> {
    const queue = [...pendingPhotos];
    let approved = 0;
    for (const item of queue) {
      if (!(await approve(item))) break;
      approved += 1;
    }
    if (approved > 0) showToast({ kind: 'success', message: `Đã duyệt ${approved} ảnh.` });
    if (approved === queue.length) setReviewing(false);
  }

  /** The clan head turns a photo down; a member withdraws their own. */
  async function removePending(item: LibraryItem): Promise<void> {
    if (
      !(await confirm(
        canManage
          ? {
              title: 'Từ chối ảnh này?',
              message: 'Ảnh sẽ bị xóa và không hiện trong album.',
              confirmLabel: 'Từ chối',
              tone: 'danger',
            }
          : {
              title: 'Rút lại ảnh này?',
              message: 'Ảnh sẽ bị xóa khỏi danh sách chờ duyệt.',
              confirmLabel: 'Rút lại',
              tone: 'danger',
            },
      ))
    )
      return;
    setReviewBusyId(item.id);
    try {
      await deleteLibraryItem(familySlug, item.id);
      setPendingPhotos((current) => current.filter((entry) => entry.id !== item.id));
    } catch (error) {
      showToast({
        kind: 'error',
        message: getApiErrorMessage(error, canManage ? 'từ chối ảnh' : 'rút lại ảnh'),
      });
    } finally {
      setReviewBusyId(null);
    }
  }

  async function removePhoto(item: LibraryItem): Promise<void> {
    if (
      !(await confirm({
        title: 'Xóa ảnh này khỏi album?',
        message: 'Ảnh sẽ bị xóa vĩnh viễn.',
        confirmLabel: 'Xóa',
        tone: 'danger',
      }))
    )
      return;
    try {
      await deleteLibraryItem(familySlug, item.id);
      const remaining = photos.filter((entry) => entry.id !== item.id);
      setPhotos(remaining);
      // The next photo takes its place; the last one gives way to the one before it.
      setCurrent((index) => Math.min(index, Math.max(0, remaining.length - 1)));
      setAlbum((current) => ({ ...current, photoCount: Math.max(0, current.photoCount - 1) }));
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'xóa ảnh') });
    }
  }

  async function removeAlbum(): Promise<void> {
    if (
      !(await confirm({
        title:
          photos.length > 0
            ? `Xóa album “${album.title}” cùng ${photos.length} ảnh?`
            : `Xóa album “${album.title}”?`,
        message: photos.length > 0 ? 'Ảnh sẽ bị xóa vĩnh viễn.' : undefined,
        confirmLabel: 'Xóa',
        tone: 'danger',
      }))
    )
      return;
    try {
      await deleteAlbum(familySlug, album.id);
      router.push(libraryHref);
      router.refresh();
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'xóa album') });
    }
  }

  const uploading = upload !== null;
  const last = photos.length - 1;
  const shown = photos[Math.min(current, Math.max(0, last))] ?? null;
  const step = useCallback(
    (by: number) => setCurrent((index) => Math.min(Math.max(0, index + by), last)),
    [last],
  );

  // The chosen thumbnail stays in view as the photos change.
  useEffect(() => {
    thumbRefs.current
      .get(current)
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [current]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      // A dialog open over the viewer, or typing in a field, keeps the arrow keys.
      if (document.querySelector('[role="dialog"]')) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea')) return;
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  async function download(): Promise<void> {
    if (!shown) return;
    setDownloading(true);
    try {
      await downloadFamilyMedia(
        familySlug,
        shown.url,
        shown.title ?? `${album.title} ${current + 1}`,
      );
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'tải ảnh') });
    } finally {
      setDownloading(false);
    }
  }

  const meta = shown ? itemMeta(shown) : '';

  return (
    // The viewer fills the screen between the family's bars: the bottom tab bar on phones and
    // tablets, the top bar from lg.
    <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col bg-stone-950 text-white lg:h-screen">
      <header className="flex h-14 shrink-0 items-center gap-2 px-2">
        <Link
          href={libraryHref}
          className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/10"
          aria-label="Về Album và tư liệu"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate font-display text-lg font-bold leading-tight">{album.title}</h1>
          <p className="text-xs tabular-nums text-white/60">
            {photos.length > 0 ? `${current + 1}/${photos.length}` : 'Chưa có ảnh'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void download()}
          disabled={!shown || downloading}
          className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/10 disabled:opacity-40"
          aria-label="Tải ảnh này xuống"
        >
          {downloading ? (
            <InlineLoader className="size-5" />
          ) : (
            <Download className="size-5" aria-hidden="true" />
          )}
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {shown ? (
          <>
            <ZoomableImage
              // A fresh, fitted view for every photo.
              key={shown.id}
              src={familyMediaSrc(familySlug, shown.url)}
              alt={shown.title ?? `Ảnh ${current + 1} của album ${album.title}`}
              onSwipe={step}
            />
            {current > 0 ? (
              <button
                type="button"
                onClick={() => step(-1)}
                className="absolute left-2 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid"
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="size-6" aria-hidden="true" />
              </button>
            ) : null}
            {current < last ? (
              <button
                type="button"
                onClick={() => step(1)}
                className="absolute right-2 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid"
                aria-label="Ảnh sau"
              >
                <ChevronRight className="size-6" aria-hidden="true" />
              </button>
            ) : null}
          </>
        ) : (
          <div className="grid justify-items-center gap-3 px-6 text-center text-sm text-white/60">
            <span className="grid size-14 place-items-center rounded-full bg-white/10 text-white">
              <ImagePlus className="size-7" aria-hidden="true" />
            </span>
            {canManage
              ? 'Album còn trống. Bấm “Thêm ảnh” để chọn nhiều ảnh một lúc.'
              : 'Album chưa có ảnh nào. Bấm “Gửi ảnh” để góp ảnh, trưởng họ sẽ duyệt.'}
          </div>
        )}
      </div>

      {shown && (shown.title || meta || shown.description) ? (
        <div className="max-h-24 shrink-0 overflow-y-auto px-4 pt-2 text-sm">
          {shown.title ? <p className="font-semibold">{shown.title}</p> : null}
          {meta ? <p className="text-xs text-white/60">{meta}</p> : null}
          {shown.description ? (
            <p className="mt-1 whitespace-pre-line break-words leading-6 text-white/80">
              {shown.description}
            </p>
          ) : null}
        </div>
      ) : null}

      {photos.length > 1 ? (
        <ul className="flex shrink-0 gap-2 overflow-x-auto px-3 py-3 [scrollbar-width:none]">
          {photos.map((photo, index) => (
            <li key={photo.id} className="shrink-0">
              <button
                ref={(node) => {
                  if (node) thumbRefs.current.set(index, node);
                  else thumbRefs.current.delete(index);
                }}
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={photo.title ?? `Ảnh ${index + 1}`}
                aria-current={index === current ? 'true' : undefined}
                className={cn(
                  'block size-16 overflow-hidden rounded-lg ring-2 transition',
                  index === current
                    ? 'ring-white'
                    : 'opacity-60 ring-transparent hover:opacity-100',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={familyMediaSrc(familySlug, photo.thumbUrl ?? photo.url)}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Everyone may add photos; a member's wait for the clan head to approve them. */}
      <div className="shrink-0 border-t border-white/10 px-3 py-2">
        {upload ? (
          <div className="mb-2 grid gap-1.5" role="status" aria-live="polite">
            <p className="text-xs text-white/70">
              Đang tải ảnh lên {upload.done}/{upload.total}…
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-300"
                style={{ width: `${Math.round((upload.done / upload.total) * 100)}%` }}
              />
            </div>
          </div>
        ) : null}
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
          <ToolButton
            icon={ImagePlus}
            spin={uploading}
            label={canManage ? 'Thêm ảnh' : 'Gửi ảnh'}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          />
          {pendingPhotos.length > 0 ? (
            <ToolButton
              icon={Hourglass}
              label={`Chờ duyệt (${pendingPhotos.length})`}
              onClick={() => setReviewing(true)}
              disabled={uploading}
            />
          ) : null}
          {canManage && shown ? (
            <>
              <ToolButton
                icon={PencilLine}
                label="Sửa ảnh"
                onClick={() => setEditingPhoto(shown)}
                disabled={uploading}
              />
              <ToolButton
                icon={Trash2}
                label="Xóa ảnh"
                onClick={() => void removePhoto(shown)}
                disabled={uploading}
              />
            </>
          ) : null}
          {canManage ? (
            <>
              <ToolButton
                icon={FolderPen}
                label="Sửa album"
                onClick={() => setEditingAlbum(true)}
                disabled={uploading}
              />
              <ToolButton
                icon={FolderX}
                label="Xóa album"
                onClick={() => void removeAlbum()}
                disabled={uploading}
                danger
              />
            </>
          ) : null}
        </div>
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

      <Presence>
        {reviewing ? (
          <PendingPhotosDialog
            familySlug={familySlug}
            photos={pendingPhotos}
            canManage={canManage}
            busyId={reviewBusyId}
            onApprove={(item) => void approve(item)}
            onApproveAll={() => void approveAll()}
            onRemove={(item) => void removePending(item)}
            onClose={() => setReviewing(false)}
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
