'use client';

import {
  FileText,
  FolderPlus,
  ImageIcon,
  Images,
  MoreHorizontal,
  PencilLine,
  Plus,
  ScrollText,
  Trash2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  detailsPayload,
  ItemDetailsFields,
  ItemEditDialog,
  itemMeta,
  LibraryLightbox,
  type ItemDetailsValue,
} from '@/components/library/item-details';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { heroOverlapClass, PageHero } from '@/components/layout/page-hero';
import { Button } from '@/components/ui/button';
import { Presence } from '@/components/ui/presence';
import { Segmented } from '@/components/ui/segmented';
import { SheetDialog } from '@/components/ui/sheet-dialog';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { compressImage, makeThumbnail } from '@/lib/image-compress';
import {
  createAlbum,
  createDocument,
  deleteLibraryItem,
  formatFileSize,
  MAX_DOCUMENT_BYTES,
  MAX_PHOTO_BYTES,
  type LibraryItem,
  type LibraryOverview,
} from '@/lib/library-api';
import { familyMediaSrc, readAsBase64 } from '@/lib/media-api';
import { searchEntriesFromPeople } from '@/lib/person-search';
import { cn } from '@/lib/utils';
import type { Person } from '@/types/family-tree';

type Tab = 'albums' | 'documents';

const inputClass =
  'w-full rounded-xl border border-stone-200 bg-white px-3 text-base outline-none transition placeholder:text-stone-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm';

function NewAlbumDialog({ familySlug, onClose }: { familySlug: string; onClose: () => void }) {
  const router = useRouter();
  const showToast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function create(): Promise<void> {
    setSaving(true);
    try {
      const album = await createAlbum(familySlug, {
        title: title.trim(),
        description: description.trim() || null,
      });
      router.push(`/${encodeURIComponent(familySlug)}/tu-lieu/${album.id}`);
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'tạo album') });
      setSaving(false);
    }
  }

  return (
    <SheetDialog
      title="Tạo album mới"
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="button" onClick={() => void create()} disabled={saving || !title.trim()}>
            {saving ? 'Đang tạo…' : 'Tạo album'}
          </Button>
        </>
      }
    >
      <label className="grid gap-1.5" htmlFor="album-title">
        <span className="text-sm font-medium text-stone-700">Tên album</span>
        <input
          id="album-title"
          className={`${inputClass} h-11`}
          placeholder="Ví dụ: Giỗ tổ năm 2025"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={191}
          autoFocus
        />
      </label>
      <label className="grid gap-1.5" htmlFor="album-description">
        <span className="text-sm font-medium text-stone-700">
          Mô tả <span className="font-normal text-stone-400">(không bắt buộc)</span>
        </span>
        <textarea
          id="album-description"
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

type PickedFile = {
  file: File;
  isPdf: boolean;
  previewUrl: string | null;
};

function NewDocumentDialog({
  familySlug,
  people,
  onClose,
  onCreated,
}: {
  familySlug: string;
  people: ReturnType<typeof searchEntriesFromPeople>;
  onClose: () => void;
  onCreated: (item: LibraryItem) => void;
}) {
  const showToast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [details, setDetails] = useState<ItemDetailsValue>({
    title: '',
    description: '',
    takenOn: '',
    person: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(
    () => () => {
      if (picked?.previewUrl) URL.revokeObjectURL(picked.previewUrl);
    },
    [picked],
  );

  function pick(file: File | undefined): void {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (isPdf && file.size > MAX_DOCUMENT_BYTES) {
      showToast({
        kind: 'error',
        message: 'Tệp PDF tối đa 4 MB. Hãy nén tệp hoặc chụp thành ảnh.',
      });
      return;
    }
    if (!isPdf && !file.type.startsWith('image/')) {
      showToast({ kind: 'error', message: 'Hãy chọn ảnh hoặc tệp PDF.' });
      return;
    }
    setPicked({ file, isPdf, previewUrl: isPdf ? null : URL.createObjectURL(file) });
    if (!details.title.trim()) {
      setDetails((current) => ({ ...current, title: file.name.replace(/\.[^.]+$/, '') }));
    }
  }

  async function save(): Promise<void> {
    if (!picked) return;
    setSaving(true);
    try {
      const upload = picked.isPdf
        ? { contentType: 'application/pdf', data: await readAsBase64(picked.file) }
        : await (async () => {
            const image = await compressImage(picked.file, MAX_PHOTO_BYTES, { maxEdge: 2400 });
            URL.revokeObjectURL(image.previewUrl);
            return {
              contentType: image.contentType,
              data: image.data,
              width: image.width,
              height: image.height,
              thumbData: await makeThumbnail(picked.file),
            };
          })();
      const payload = detailsPayload(details);
      const created = await createDocument(familySlug, {
        ...upload,
        ...payload,
        title: payload.title ?? '',
      });
      onCreated(created);
      onClose();
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'thêm tư liệu') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SheetDialog
      title="Thêm tư liệu"
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving || !picked || !details.title.trim()}
          >
            {saving ? <InlineLoader className="size-4" /> : null}
            {saving ? 'Đang tải lên…' : 'Lưu tư liệu'}
          </Button>
        </>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {picked ? (
        <div className="flex items-center gap-3 rounded-xl border border-stone-200 p-2">
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-stone-100">
            {picked.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={picked.previewUrl} alt="" className="size-full object-cover" />
            ) : (
              <FileText className="size-7 text-red-600" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-stone-800">
              {picked.file.name}
            </span>
            <span className="text-xs text-stone-500">
              {picked.isPdf ? 'PDF' : 'Ảnh'} · {formatFileSize(picked.file.size)}
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Đổi tệp
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="grid place-items-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-600 transition hover:border-brand-600 hover:bg-brand-50/50"
        >
          <Upload className="size-7 text-brand-700" aria-hidden="true" />
          <span className="font-semibold text-stone-800">Chọn ảnh hoặc tệp PDF</span>
          <span className="text-xs text-stone-500">
            Ảnh chụp gia phả, sắc phong, giấy tờ… PDF tối đa 4 MB.
          </span>
        </button>
      )}
      <ItemDetailsFields
        value={details}
        onChange={setDetails}
        people={people}
        titleLabel="Tên tư liệu"
        titleRequired
        titlePlaceholder="Ví dụ: Sắc phong thời Tự Đức"
      />
    </SheetDialog>
  );
}

function DocumentRow({
  item,
  familySlug,
  canManage,
  onOpen,
  onEdit,
  onDelete,
}: {
  item: LibraryItem;
  familySlug: string;
  canManage: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isPdf = item.contentType === 'application/pdf';
  const meta = itemMeta(item);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent): void => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  const body = (
    <>
      <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-stone-100">
        {isPdf ? (
          <span className="grid justify-items-center text-red-600">
            <FileText className="size-7" aria-hidden="true" />
            <span className="text-[10px] font-bold">PDF</span>
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={familyMediaSrc(familySlug, item.thumbUrl ?? item.url)}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        )}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block font-semibold leading-snug text-stone-900">{item.title}</span>
        {meta ? <span className="mt-0.5 block text-xs text-stone-500">{meta}</span> : null}
        {item.description ? (
          <span className="mt-1 line-clamp-2 block text-sm leading-5 text-stone-600">
            {item.description}
          </span>
        ) : null}
        <span className="mt-1 block text-xs text-stone-400">{formatFileSize(item.sizeBytes)}</span>
      </span>
    </>
  );

  return (
    <li className="flex items-start gap-1 px-2 py-2 sm:px-3">
      {isPdf ? (
        <a
          href={familyMediaSrc(familySlug, item.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 flex-1 gap-3 rounded-xl p-2 transition hover:bg-stone-50"
        >
          {body}
        </a>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 gap-3 rounded-xl p-2 transition hover:bg-stone-50"
        >
          {body}
        </button>
      )}
      {canManage ? (
        <div ref={menuRef} className="relative mt-2">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="grid size-9 place-items-center rounded-full text-stone-500 hover:bg-stone-100"
            aria-label={`Tùy chọn tư liệu ${item.title ?? ''}`}
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="ui-dialog absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-xl"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-stone-50"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
              >
                <PencilLine className="size-4" aria-hidden="true" />
                Sửa thông tin
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm text-red-700 hover:bg-red-50"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Xóa tư liệu
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function LibraryView({
  familySlug,
  initial,
  people,
}: {
  familySlug: string;
  initial: LibraryOverview;
  people: Person[];
}) {
  const confirm = useConfirm();
  const showToast = useToast();
  const [tab, setTab] = useState<Tab>('albums');
  const [documents, setDocuments] = useState(initial.documents);
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [addingDocument, setAddingDocument] = useState(false);
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const canManage = initial.canManage;
  const pendingTotal = initial.albums.reduce((sum, album) => sum + album.pendingCount, 0);
  const entries = useMemo(() => searchEntriesFromPeople(people), [people]);
  const imageDocuments = documents.filter((item) => item.contentType !== 'application/pdf');

  useEffect(() => {
    if (window.location.hash === '#tu-lieu') setTab('documents');
  }, []);

  function switchTab(next: Tab): void {
    setTab(next);
    window.history.replaceState(null, '', next === 'documents' ? '#tu-lieu' : '#album');
  }

  async function removeDocument(item: LibraryItem): Promise<void> {
    if (
      !(await confirm({
        title: `Xóa tư liệu “${item.title ?? ''}”?`,
        message: 'Tệp sẽ bị xóa vĩnh viễn.',
        confirmLabel: 'Xóa',
        tone: 'danger',
      }))
    )
      return;
    try {
      await deleteLibraryItem(familySlug, item.id);
      setDocuments((current) => current.filter((entry) => entry.id !== item.id));
      setViewing(null);
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'xóa tư liệu') });
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-3 pb-6 sm:gap-4 sm:px-4 sm:py-6 lg:max-w-5xl lg:px-8 lg:py-8">
      <PageHero
        title="Album và tư liệu"
        icon={Images}
        description="Ảnh họp họ, giỗ tổ và những tư liệu quý của dòng họ."
        overlap
      />
      <div className={cn('surface p-1.5', heroOverlapClass)}>
        <Segmented
          asTabs
          label="Thư viện"
          value={tab}
          onChange={switchTab}
          className="bg-transparent p-0"
          options={[
            {
              value: 'albums',
              label: 'Album ảnh',
              count: initial.albums.length,
              icon: <ImageIcon className="size-4 shrink-0" aria-hidden="true" />,
            },
            {
              value: 'documents',
              label: 'Tư liệu',
              count: documents.length,
              icon: <ScrollText className="size-4 shrink-0" aria-hidden="true" />,
            },
          ]}
        />
      </div>

      {tab === 'albums' ? (
        <section aria-label="Album ảnh" className="grid gap-3 px-3 sm:gap-4 sm:px-0">
          {canManage ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-stone-500">
                {pendingTotal > 0 ? (
                  <span className="font-medium text-amber-800">
                    {pendingTotal} ảnh thành viên gửi đang chờ duyệt
                  </span>
                ) : null}
              </p>
              <Button type="button" size="sm" onClick={() => setCreatingAlbum(true)}>
                <FolderPlus className="size-4" aria-hidden="true" />
                Tạo album
              </Button>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {initial.albums.map((album) => (
              <Link
                key={album.id}
                href={`/${encodeURIComponent(familySlug)}/tu-lieu/${album.id}`}
                className="surface group grid overflow-hidden transition hover:shadow-md"
              >
                <span className="relative block aspect-square overflow-hidden bg-stone-100">
                  {album.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={familyMediaSrc(familySlug, album.cover.url)}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="grid size-full place-items-center text-stone-300">
                      <ImageIcon className="size-10" aria-hidden="true" />
                    </span>
                  )}
                  {album.pendingCount > 0 ? (
                    <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white shadow">
                      {album.pendingCount} chờ duyệt
                    </span>
                  ) : null}
                </span>
                <span className="grid gap-0.5 px-3 py-2.5">
                  <span className="line-clamp-2 font-semibold leading-snug text-stone-900">
                    {album.title}
                  </span>
                  <span className="text-xs text-stone-500">{album.photoCount} ảnh</span>
                </span>
              </Link>
            ))}
          </div>
          {initial.albums.length === 0 ? (
            <p className="surface px-6 py-12 text-center text-sm text-stone-500">
              {canManage
                ? 'Chưa có album nào. Bấm “Tạo album” để bắt đầu lưu ảnh của dòng họ.'
                : 'Dòng họ chưa có album nào.'}
            </p>
          ) : null}
        </section>
      ) : (
        <section aria-label="Tư liệu" className="grid gap-2">
          {canManage ? (
            <div className="px-3 sm:px-0">
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => setAddingDocument(true)}
              >
                <Plus className="size-4" aria-hidden="true" />
                Thêm tư liệu
              </Button>
            </div>
          ) : null}
          {documents.length === 0 ? (
            <div className="surface mx-3 grid justify-items-center gap-2 px-6 py-12 text-center text-sm text-stone-500 sm:mx-0">
              <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
                <ScrollText className="size-6" aria-hidden="true" />
              </span>
              {canManage
                ? 'Lưu giữ gia phả chép tay, sắc phong, văn bia, giấy tờ cũ… để con cháu cùng xem.'
                : 'Dòng họ chưa có tư liệu nào.'}
            </div>
          ) : (
            <ul className="surface mx-3 divide-y divide-line overflow-hidden sm:mx-0">
              {documents.map((item) => (
                <DocumentRow
                  key={item.id}
                  item={item}
                  familySlug={familySlug}
                  canManage={canManage}
                  onOpen={() =>
                    setViewing(imageDocuments.findIndex((entry) => entry.id === item.id))
                  }
                  onEdit={() => setEditing(item)}
                  onDelete={() => void removeDocument(item)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      <Presence>
        {creatingAlbum ? (
          <NewAlbumDialog familySlug={familySlug} onClose={() => setCreatingAlbum(false)} />
        ) : null}
      </Presence>
      <Presence>
        {addingDocument ? (
          <NewDocumentDialog
            familySlug={familySlug}
            people={entries}
            onClose={() => setAddingDocument(false)}
            onCreated={(item) => setDocuments((current) => [item, ...current])}
          />
        ) : null}
      </Presence>
      <Presence>
        {editing ? (
          <ItemEditDialog
            familySlug={familySlug}
            item={editing}
            people={entries}
            onClose={() => setEditing(null)}
            onSaved={(item) =>
              setDocuments((current) =>
                current.map((entry) => (entry.id === item.id ? item : entry)),
              )
            }
          />
        ) : null}
      </Presence>
      <Presence>
        {viewing !== null && viewing >= 0 ? (
          <LibraryLightbox
            items={imageDocuments}
            familySlug={familySlug}
            startIndex={viewing}
            canManage={canManage}
            onClose={() => setViewing(null)}
            onEdit={(item) => {
              setViewing(null);
              setEditing(item);
            }}
            onDelete={(item) => void removeDocument(item)}
          />
        ) : null}
      </Presence>
    </div>
  );
}
