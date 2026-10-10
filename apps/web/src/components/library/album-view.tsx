'use client';

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  FolderPen,
  FolderX,
  ImagePlus,
  Hourglass,
  LayoutGrid,
  List,
  MoreHorizontal,
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

const MIN_COLUMNS = 2;
const MAX_COLUMNS = 8;
const DEFAULT_COLUMNS = 5;
const COLUMN_CHOICES = Array.from(
  { length: MAX_COLUMNS - MIN_COLUMNS + 1 },
  (_, index) => MIN_COLUMNS + index,
);
const COLUMNS_KEY = 'giapha:album-columns';
const LAYOUT_KEY = 'giapha:album-layout';

type Layout = 'grid' | 'list';

function storeChoice(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

const inputClass =
  'w-full rounded-xl border border-stone-200 bg-white px-3 text-base outline-none transition placeholder:text-stone-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm';

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
      <span className="max-w-full text-center sm:truncate">{label}</span>
    </button>
  );
}

function BarButton({
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
        // Phones: buttons share the bar evenly, icon over a short label, so up to four fit
        // without scrolling. From sm up: the original pill row.
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-1.5 text-[11px] font-medium leading-tight transition disabled:opacity-40 sm:h-10 sm:flex-none sm:shrink-0 sm:flex-row sm:gap-2 sm:rounded-full sm:px-6 sm:py-0 sm:text-sm',
        danger
          ? 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
          : 'border-emerald-900/15 bg-emerald-50/60 text-stone-800 hover:bg-emerald-50',
      )}
    >
      {spin ? (
        <InlineLoader className="size-4" />
      ) : (
        <Icon
          className={cn('size-4', danger ? 'text-red-700' : 'text-emerald-900')}
          aria-hidden="true"
        />
      )}
      {label}
    </button>
  );
}

function SelectMark({
  selected,
  label,
  onToggle,
  className,
}: {
  selected: boolean;
  label: string;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      aria-pressed={selected}
      aria-label={label}
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-full border-2 shadow-sm transition',
        selected
          ? 'border-emerald-800 bg-emerald-800 text-white'
          : 'border-white bg-white/30 text-transparent hover:bg-white/60',
        className,
      )}
    >
      <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
    </button>
  );
}

function PhotoMenu({
  label,
  canManage,
  onOpen,
  onDownload,
  onEdit,
  onDelete,
  className,
}: {
  label: string;
  canManage: boolean;
  onOpen: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent): void => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const items: { icon: LucideIcon; label: string; run: () => void; danger?: boolean }[] = [
    { icon: Expand, label: 'Xem ảnh', run: onOpen },
    { icon: Download, label: 'Tải xuống', run: onDownload },
    ...(canManage
      ? [
          { icon: PencilLine, label: 'Sửa thông tin', run: onEdit },
          { icon: Trash2, label: 'Xóa ảnh', run: onDelete, danger: true },
        ]
      : []),
  ];

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="grid size-7 place-items-center rounded-full bg-white/90 text-stone-700 shadow-sm transition hover:bg-white"
        aria-label={`Tùy chọn ${label}`}
        aria-expanded={open}
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          className="ui-dialog absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 text-stone-800 shadow-xl"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={cn(
                'flex w-full items-center gap-3 px-3.5 py-2.5 text-sm',
                item.danger ? 'text-red-700 hover:bg-red-50' : 'hover:bg-stone-50',
              )}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                item.run();
              }}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
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
  const [viewing, setViewing] = useState(false);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [layout, setLayout] = useState<Layout>('grid');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const thumbRefs = useRef(new Map<number, HTMLButtonElement>());
  const tileRefs = useRef(new Map<number, HTMLLIElement>());
  const [editingPhoto, setEditingPhoto] = useState<LibraryItem | null>(null);
  const [editingAlbum, setEditingAlbum] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canManage = initial.canManage;
  const entries = useMemo(() => searchEntriesFromPeople(people), [people]);
  const libraryHref = `/${encodeURIComponent(familySlug)}/tu-lieu`;

  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem(COLUMNS_KEY));
      if (Number.isInteger(stored) && stored >= MIN_COLUMNS && stored <= MAX_COLUMNS) {
        setColumns(stored);
      } else if (window.matchMedia('(max-width: 39.999rem)').matches) {
        setColumns(3);
      }
      if (window.localStorage.getItem(LAYOUT_KEY) === 'list') setLayout('list');
    } catch {}
  }, []);

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

  function dropPhotos(ids: ReadonlySet<string>): void {
    const remaining = photos.filter((entry) => !ids.has(entry.id));
    setPhotos(remaining);
    setCurrent((index) => Math.min(index, Math.max(0, remaining.length - 1)));
    setSelected((current) => new Set([...current].filter((id) => !ids.has(id))));
    setAlbum((current) => ({
      ...current,
      photoCount: Math.max(0, current.photoCount - (photos.length - remaining.length)),
    }));
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
      dropPhotos(new Set([item.id]));
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'xóa ảnh') });
    }
  }

  async function removeSelected(): Promise<void> {
    const ids = [...selected];
    if (
      !(await confirm({
        title: `Xóa ${ids.length} ảnh đã chọn?`,
        message: 'Ảnh sẽ bị xóa vĩnh viễn.',
        confirmLabel: 'Xóa',
        tone: 'danger',
      }))
    )
      return;
    setBulkBusy(true);
    const deleted = new Set<string>();
    try {
      for (const id of ids) {
        await deleteLibraryItem(familySlug, id);
        deleted.add(id);
      }
      showToast({ kind: 'success', message: `Đã xóa ${deleted.size} ảnh.` });
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'xóa ảnh') });
    } finally {
      dropPhotos(deleted);
      setBulkBusy(false);
    }
  }

  async function downloadPhoto(item: LibraryItem): Promise<void> {
    const index = photos.findIndex((entry) => entry.id === item.id);
    await downloadFamilyMedia(familySlug, item.url, item.title ?? `${album.title} ${index + 1}`);
  }

  async function downloadSelected(): Promise<void> {
    setBulkBusy(true);
    try {
      for (const photo of photos.filter((entry) => selected.has(entry.id))) {
        await downloadPhoto(photo);
      }
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'tải ảnh') });
    } finally {
      setBulkBusy(false);
    }
  }

  function toggleSelected(id: string): void {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
  const busy = uploading || bulkBusy;
  const selecting = selected.size > 0;
  const last = photos.length - 1;
  const shown = photos[Math.min(current, Math.max(0, last))] ?? null;
  const step = useCallback(
    (by: number) => setCurrent((index) => Math.min(Math.max(0, index + by), last)),
    [last],
  );

  function chooseColumns(count: number): void {
    setColumns(count);
    storeChoice(COLUMNS_KEY, String(count));
  }

  function chooseLayout(next: Layout): void {
    setLayout(next);
    storeChoice(LAYOUT_KEY, next);
  }

  function tapPhoto(index: number): void {
    const photo = photos[index];
    if (!photo) return;
    if (selecting) {
      toggleSelected(photo.id);
      return;
    }
    setCurrent(index);
    setViewing(true);
  }

  const viewerOpen = viewing && shown !== null;

  useEffect(() => {
    if (viewerOpen) {
      thumbRefs.current
        .get(current)
        ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } else {
      tileRefs.current.get(current)?.scrollIntoView({ block: 'nearest' });
    }
  }, [current, viewerOpen]);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (event: KeyboardEvent): void => {
      if (document.querySelector('[role="dialog"]:not([data-album-viewer])')) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea')) return;
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'Escape') setViewing(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, viewerOpen]);

  async function download(): Promise<void> {
    if (!shown) return;
    setDownloading(true);
    try {
      await downloadPhoto(shown);
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'tải ảnh') });
    } finally {
      setDownloading(false);
    }
  }

  function photoMenu(photo: LibraryItem, index: number, label: string, className?: string) {
    return (
      <PhotoMenu
        label={label}
        canManage={canManage}
        className={className}
        onOpen={() => {
          setCurrent(index);
          setViewing(true);
        }}
        onDownload={() =>
          void downloadPhoto(photo).catch((error: unknown) =>
            showToast({ kind: 'error', message: getApiErrorMessage(error, 'tải ảnh') }),
          )
        }
        onEdit={() => setEditingPhoto(photo)}
        onDelete={() => void removePhoto(photo)}
      />
    );
  }

  const meta = shown ? itemMeta(shown) : '';

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] max-w-7xl flex-col px-3 sm:px-6 lg:h-screen">
      <header className="flex shrink-0 items-center gap-3 py-4 sm:py-6">
        <Link
          href={libraryHref}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white/90 text-stone-800 shadow-sm transition hover:bg-white sm:size-12"
          aria-label="Về Album và tư liệu"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-bold leading-tight text-emerald-900 sm:text-2xl">
            {album.title}
          </h1>
          <p className="text-sm tabular-nums text-stone-500">
            {photos.length > 0 ? `${photos.length} ảnh` : 'Chưa có ảnh'}
          </p>
        </div>
        {photos.length > 0 ? (
          <div className="flex shrink-0 items-center gap-1 rounded-2xl bg-white/90 p-1.5 shadow-sm">
            <div className="flex gap-1" role="group" aria-label="Kiểu hiển thị">
              {(
                [
                  { value: 'list', icon: List, label: 'Dạng danh sách' },
                  { value: 'grid', icon: LayoutGrid, label: 'Dạng lưới' },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => chooseLayout(option.value)}
                  aria-pressed={layout === option.value}
                  aria-label={option.label}
                  className={cn(
                    'grid size-9 place-items-center rounded-xl transition',
                    layout === option.value
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'text-stone-700 hover:bg-stone-100',
                  )}
                >
                  <option.icon className="size-4" aria-hidden="true" />
                </button>
              ))}
            </div>
            {layout === 'grid' ? (
              <label className="relative flex items-center">
                <span className="sr-only">Số ảnh mỗi hàng</span>
                <select
                  value={columns}
                  onChange={(event) => chooseColumns(Number(event.target.value))}
                  className="h-9 cursor-pointer appearance-none rounded-xl bg-transparent pl-3 pr-8 text-sm font-medium text-stone-800 outline-none hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-emerald-800/30"
                >
                  {COLUMN_CHOICES.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2 size-4 text-stone-600"
                  aria-hidden="true"
                />
              </label>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-4">
        {photos.length === 0 ? (
          <div className="grid h-full place-items-center">
            <div className="grid max-w-sm justify-items-center gap-3 rounded-2xl bg-white/80 px-6 py-8 text-center text-sm text-stone-600 shadow-sm">
              <span className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-800">
                <ImagePlus className="size-7" aria-hidden="true" />
              </span>
              {canManage
                ? 'Album còn trống. Bấm “Thêm ảnh” để chọn nhiều ảnh một lúc.'
                : 'Album chưa có ảnh nào. Bấm “Gửi ảnh” để góp ảnh, trưởng họ sẽ duyệt.'}
            </div>
          </div>
        ) : layout === 'grid' ? (
          <ul
            className="grid gap-2 sm:gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {photos.map((photo, index) => {
              const label = photo.title ?? `Ảnh ${index + 1}`;
              const picked = selected.has(photo.id);
              const compact = columns >= 7;
              return (
                <li
                  key={photo.id}
                  ref={(node) => {
                    if (node) tileRefs.current.set(index, node);
                    else tileRefs.current.delete(index);
                  }}
                  className="relative"
                >
                  <button
                    type="button"
                    onClick={() => tapPhoto(index)}
                    aria-label={label}
                    className={cn(
                      'group block aspect-square w-full overflow-hidden rounded-lg bg-white/60 shadow-sm ring-2 transition sm:rounded-xl',
                      picked ? 'ring-emerald-800' : 'ring-transparent hover:shadow-md',
                      'focus-visible:outline-none focus-visible:ring-emerald-800/60',
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={familyMediaSrc(familySlug, photo.thumbUrl ?? photo.url)}
                      alt=""
                      loading="lazy"
                      className={cn(
                        'size-full object-cover transition duration-300',
                        picked ? 'scale-95 rounded-md' : 'group-hover:scale-105',
                      )}
                    />
                  </button>
                  {!compact || picked || selecting ? (
                    <SelectMark
                      selected={picked}
                      label={picked ? `Bỏ chọn ${label}` : `Chọn ${label}`}
                      onToggle={() => toggleSelected(photo.id)}
                      className="absolute left-1.5 top-1.5 sm:left-2.5 sm:top-2.5"
                    />
                  ) : null}
                  {!compact && !selecting
                    ? photoMenu(
                        photo,
                        index,
                        label,
                        'absolute right-1.5 top-1.5 sm:right-2.5 sm:top-2.5',
                      )
                    : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="grid gap-2">
            {photos.map((photo, index) => {
              const label = photo.title ?? `Ảnh ${index + 1}`;
              const picked = selected.has(photo.id);
              const photoMeta = itemMeta(photo);
              return (
                <li
                  key={photo.id}
                  ref={(node) => {
                    if (node) tileRefs.current.set(index, node);
                    else tileRefs.current.delete(index);
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl bg-white/85 p-2 pr-3 shadow-sm ring-2 transition',
                    picked ? 'ring-emerald-800' : 'ring-transparent',
                  )}
                >
                  <SelectMark
                    selected={picked}
                    label={picked ? `Bỏ chọn ${label}` : `Chọn ${label}`}
                    onToggle={() => toggleSelected(photo.id)}
                    className={cn('ml-1', picked ? '' : 'border-stone-300 bg-white')}
                  />
                  <button
                    type="button"
                    onClick={() => tapPhoto(index)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={familyMediaSrc(familySlug, photo.thumbUrl ?? photo.url)}
                      alt=""
                      loading="lazy"
                      className="size-16 shrink-0 rounded-xl object-cover sm:size-20"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-stone-800">{label}</span>
                      {photoMeta ? (
                        <span className="block truncate text-xs text-stone-500">{photoMeta}</span>
                      ) : null}
                      {photo.description ? (
                        <span className="mt-0.5 line-clamp-2 text-sm text-stone-600">
                          {photo.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  {!selecting ? photoMenu(photo, index, label) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mb-3 shrink-0 rounded-2xl bg-white/95 px-3 py-3 shadow-[0_-4px_24px_-8px_rgba(74,46,18,0.25)] sm:mb-4 sm:px-5">
        {upload ? (
          <div className="mb-3 grid gap-1.5" role="status" aria-live="polite">
            <p className="text-xs text-stone-600">
              Đang tải ảnh lên {upload.done}/{upload.total}…
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-emerald-800 transition-[width] duration-300"
                style={{ width: `${Math.round((upload.done / upload.total) * 100)}%` }}
              />
            </div>
          </div>
        ) : null}
        <div className="flex items-center gap-2 sm:gap-3">
          <p className="hidden shrink-0 text-sm text-stone-600 sm:block" aria-live="polite">
            Đã chọn <span className="font-semibold text-stone-900">{selected.size}</span> ảnh
          </p>
          <div className="flex min-w-0 flex-1 gap-1.5 sm:justify-center sm:gap-3 sm:overflow-x-auto sm:[scrollbar-width:none]">
            {selecting ? (
              <>
                <BarButton icon={X} label="Bỏ chọn" onClick={() => setSelected(new Set())} />
                <BarButton
                  icon={Download}
                  label={`Tải ${selected.size} ảnh`}
                  spin={bulkBusy}
                  onClick={() => void downloadSelected()}
                  disabled={busy}
                />
                {canManage ? (
                  <BarButton
                    icon={Trash2}
                    label={`Xóa ${selected.size} ảnh`}
                    onClick={() => void removeSelected()}
                    disabled={busy}
                    danger
                  />
                ) : null}
              </>
            ) : (
              <>
                <BarButton
                  icon={ImagePlus}
                  spin={uploading}
                  label={canManage ? 'Thêm ảnh' : 'Gửi ảnh'}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                />
                {pendingPhotos.length > 0 ? (
                  <BarButton
                    icon={Hourglass}
                    label={`Chờ duyệt (${pendingPhotos.length})`}
                    onClick={() => setReviewing(true)}
                    disabled={busy}
                  />
                ) : null}
                {canManage ? (
                  <>
                    <BarButton
                      icon={FolderPen}
                      label="Sửa album"
                      onClick={() => setEditingAlbum(true)}
                      disabled={busy}
                    />
                    <BarButton
                      icon={FolderX}
                      label="Xóa album"
                      onClick={() => void removeAlbum()}
                      disabled={busy}
                      danger
                    />
                  </>
                ) : null}
              </>
            )}
          </div>
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
        {viewerOpen && shown ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Ảnh ${current + 1} của album ${album.title}`}
            data-album-viewer=""
            className="ui-backdrop fixed inset-0 z-[60] flex flex-col bg-stone-950/40 pb-[env(safe-area-inset-bottom)] text-white backdrop-blur-2xl"
          >
            <header className="flex h-14 shrink-0 items-center gap-2 px-2">
              <button
                type="button"
                onClick={() => setViewing(false)}
                className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/10"
                aria-label="Đóng ảnh"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1 text-center">
                <p className="truncate font-display text-lg font-bold leading-tight">
                  {album.title}
                </p>
                <p className="text-xs tabular-nums text-white/60">
                  {current + 1}/{photos.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void download()}
                disabled={downloading}
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

            <div className="ui-dialog relative flex min-h-0 flex-1 items-center justify-center">
              <ZoomableImage
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
            </div>

            {shown.title || meta || shown.description ? (
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
                        'block size-14 overflow-hidden rounded-lg ring-2 transition',
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

            {canManage ? (
              <div className="flex shrink-0 gap-1 border-t border-white/10 px-3 py-2">
                <ToolButton
                  icon={PencilLine}
                  label="Sửa ảnh"
                  onClick={() => setEditingPhoto(shown)}
                />
                <ToolButton icon={Trash2} label="Xóa ảnh" onClick={() => void removePhoto(shown)} />
              </div>
            ) : null}
          </div>
        ) : null}
      </Presence>

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
