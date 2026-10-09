'use client';

import {
  ArrowLeft,
  Eye,
  EyeOff,
  ImageIcon,
  ImagePlus,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { InlineLoader } from '@/components/ui/heritage-loader';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/auth/form-fields';
import { hasTreeArea, NO_TREE_AREA, PosterAreaEditor } from '@/components/admin/poster-area-editor';
import { PosterBackgroundSwatch } from '@/components/tree/poster-art';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/admin/admin-layout';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { ACCEPTED_IMAGE_TYPES, readAsBase64 } from '@/lib/media-api';
import {
  createPosterDecoration,
  deletePosterDecoration,
  listPosterDecorations,
  MAX_DECORATION_IMAGE_BYTES,
  MAX_INSET_PERCENT,
  MAX_OPPOSITE_INSETS_PERCENT,
  updatePosterDecoration,
  type AdminPosterDecoration,
  type PosterBackgroundMode,
  type PosterDecoration,
  type PosterInsets,
  type PosterNameArea,
  type PosterVerticalTextArea,
} from '@/lib/poster-decorations';

type Draft = {
  /** Null while adding a new background. */
  id: string | null;
  name: string;
  sortOrder: string;
  isActive: boolean;
  backgroundMode: PosterBackgroundMode;
  insets: PosterInsets;
  nameArea: PosterNameArea | null;
  leftTextArea: PosterVerticalTextArea | null;
  rightTextArea: PosterVerticalTextArea | null;
  file: File | null;
  /** The saved image, kept for the preview until a new file replaces it. */
  imageUrl: string | null;
};

/** What the API takes: a background without a tree area is stored as null. */
function insetsToSave(insets: PosterInsets): PosterInsets | null {
  return hasTreeArea(insets) ? insets : null;
}

function insetsProblem(insets: PosterInsets): string | null {
  if (
    insets.top + insets.bottom > MAX_OPPOSITE_INSETS_PERCENT ||
    insets.left + insets.right > MAX_OPPOSITE_INSETS_PERCENT
  ) {
    return `Lề hai cạnh đối diện cộng lại không được vượt quá ${MAX_OPPOSITE_INSETS_PERCENT}%.`;
  }
  return null;
}

const INSET_EDGES = [
  { edge: 'top', label: 'Trên' },
  { edge: 'right', label: 'Phải' },
  { edge: 'bottom', label: 'Dưới' },
  { edge: 'left', label: 'Trái' },
] as const;

/** Four percent fields, one per edge of the tree area. */
function InsetFields({
  legend,
  hint,
  insets,
  onChange,
}: {
  legend: string;
  hint: string;
  insets: PosterInsets;
  onChange: (insets: PosterInsets) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium text-brand-950">{legend}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {INSET_EDGES.map(({ edge, label }) => (
          <label key={edge} className="grid gap-1 text-xs text-stone-600">
            {label} (%)
            <input
              type="number"
              min={0}
              max={MAX_INSET_PERCENT}
              step={0.1}
              value={insets[edge]}
              onChange={(event) => {
                const value = Math.round(Number(event.currentTarget.value) * 10) / 10;
                onChange({
                  ...insets,
                  [edge]: Number.isFinite(value)
                    ? Math.min(MAX_INSET_PERCENT, Math.max(0, value))
                    : 0,
                });
              }}
              className="h-10 rounded-xl border bg-white px-3 text-base text-stone-900 outline-none sm:text-sm focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15"
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-stone-500">{hint}</p>
      {insetsProblem(insets) ? (
        <p className="text-xs font-medium text-red-700">{insetsProblem(insets)}</p>
      ) : null}
    </fieldset>
  );
}

function draftFor(decoration?: PosterDecoration): Draft {
  return {
    id: decoration?.id ?? null,
    name: decoration?.name ?? '',
    sortOrder: decoration ? String(decoration.sortOrder) : '',
    isActive: decoration?.isActive ?? true,
    backgroundMode: decoration?.backgroundMode ?? 'STRETCH',
    insets: decoration?.insets ?? NO_TREE_AREA,
    nameArea: decoration?.nameArea ?? null,
    leftTextArea: decoration?.leftTextArea ?? null,
    rightTextArea: decoration?.rightTextArea ?? null,
    file: null,
    imageUrl: decoration?.imageUrl ?? null,
  };
}

const checkboxClass = 'size-4 rounded border-stone-300 accent-brand-800';
const selectClass =
  'h-11 rounded-xl border bg-white px-3 text-base outline-none sm:text-sm focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15';

function BackgroundEditor({
  draft,
  saved,
  saving,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: Draft;
  saved: PosterDecoration | undefined;
  saving: boolean;
  onChange: (draft: Draft) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // The editor replaces the library, so bring its top into view when it opens.
  useEffect(() => {
    document
      .getElementById('background-editor')
      ?.closest('[role="tabpanel"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (!draft.file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(draft.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.file]);

  // The sample is drawn exactly as the poster will draw it, from the unsaved options.
  const sample: PosterDecoration = {
    id: draft.id ?? 'new',
    kind: 'BACKGROUND',
    name: draft.name,
    imageUrl: previewUrl ?? draft.imageUrl,
    isActive: draft.isActive,
    sortOrder: Number(draft.sortOrder) || 0,
    backgroundMode: draft.backgroundMode,
    insets: draft.insets,
    nameArea: draft.nameArea,
    leftTextArea: draft.leftTextArea,
    rightTextArea: draft.rightTextArea,
  };

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit();
  }

  return (
    <SectionCard
      icon={draft.id ? <Pencil aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
      title={draft.id ? `Sửa hình nền “${saved?.name ?? draft.name}”` : 'Thêm hình nền mới'}
      description="Đánh dấu các vùng trên ảnh ở bên trái, chỉnh thông tin ở bên phải rồi lưu."
      actions={
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Quay lại thư viện
        </Button>
      }
      footer={
        <>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="background-editor" disabled={saving}>
            {saving ? (
              <InlineLoader className="size-4" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {saving ? 'Đang lưu…' : draft.id ? 'Lưu thay đổi' : 'Thêm hình nền'}
          </Button>
        </>
      }
    >
      <form
        id="background-editor"
        className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]"
        onSubmit={handleSubmit}
      >
        <div className="min-w-0">
          {sample.imageUrl ? (
            <PosterAreaEditor
              background={sample}
              treeArea={draft.insets}
              nameArea={draft.nameArea}
              leftTextArea={draft.leftTextArea}
              rightTextArea={draft.rightTextArea}
              onTreeAreaChange={(insets) => onChange({ ...draft, insets })}
              onNameAreaChange={(nameArea) => onChange({ ...draft, nameArea })}
              onLeftTextAreaChange={(leftTextArea) => onChange({ ...draft, leftTextArea })}
              onRightTextAreaChange={(rightTextArea) => onChange({ ...draft, rightTextArea })}
            />
          ) : (
            <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-gold-700/35 bg-paper-deep/70 p-6 text-center">
              <span className="grid justify-items-center gap-2 text-sm text-stone-500">
                <ImagePlus className="size-8 text-stone-400" aria-hidden="true" />
                Chọn ảnh nền để bắt đầu đánh dấu các vùng
              </span>
            </div>
          )}
        </div>

        <div className="grid gap-5">
          <Field
            id="decoration-name"
            label="Tên hình nền"
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.currentTarget.value })}
            maxLength={100}
            required
          />

          <label className="grid gap-1.5" htmlFor="decoration-image">
            <span className="text-sm font-medium text-brand-950">
              Ảnh nền {draft.id ? '(để trống nếu giữ ảnh cũ)' : ''}
            </span>
            <input
              id="decoration-image"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              required={!draft.id}
              onChange={(event) =>
                onChange({ ...draft, file: event.currentTarget.files?.[0] ?? null })
              }
              className="rounded-xl border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-900 file:px-3 file:py-1.5 file:text-white"
            />
            <span className="text-xs leading-5 text-stone-500">
              PNG, JPG hoặc WEBP, tối đa 4 MB, tỉ lệ 16:9 với hoa văn vẽ sẵn.
            </span>
          </label>

          <label className="grid gap-1.5" htmlFor="decoration-mode">
            <span className="text-sm font-medium text-brand-950">Cách trải ảnh nền</span>
            <select
              id="decoration-mode"
              className={selectClass}
              value={draft.backgroundMode}
              onChange={(event) =>
                onChange({
                  ...draft,
                  backgroundMode: event.currentTarget.value as PosterBackgroundMode,
                })
              }
            >
              <option value="STRETCH">Kéo giãn vừa tờ (giữ khung sát mép)</option>
              <option value="COVER">Phủ kín cả tờ (có thể cắt mép)</option>
              <option value="TILE">Lát lặp lại (hoa văn nhỏ, không khung)</option>
            </select>
          </label>

          <Field
            id="decoration-order"
            label="Thứ tự hiển thị"
            type="number"
            min={0}
            max={9999}
            value={draft.sortOrder}
            onChange={(event) => onChange({ ...draft, sortOrder: event.currentTarget.value })}
          />

          <label className="flex items-start gap-3 rounded-xl border bg-white px-3.5 py-3 text-sm text-brand-950">
            <input
              type="checkbox"
              className={checkboxClass + ' mt-0.5'}
              checked={draft.isActive}
              onChange={(event) => onChange({ ...draft, isActive: event.currentTarget.checked })}
            />
            <span className="font-medium">Hiển thị cho trưởng họ</span>
          </label>

          <details className="rounded-xl border bg-white px-3.5 py-3">
            <summary className="cursor-pointer text-sm font-medium text-brand-950">
              Nhập số chính xác cho vùng đặt cây
            </summary>
            <div className="mt-3">
              <InsetFields
                legend="Lề vùng đặt cây"
                hint="Khoảng cách từ mỗi mép ảnh tới vùng đặt cây, theo phần trăm. Để cả bốn ô bằng 0 nếu ảnh không có vùng đặt cây."
                insets={draft.insets}
                onChange={(insets) => onChange({ ...draft, insets })}
              />
            </div>
          </details>
        </div>
      </form>
    </SectionCard>
  );
}

/** A background sample stretched to the width of its container at 16:9. */
function FittedSwatch({
  decoration,
  className,
}: {
  decoration: PosterDecoration;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={'aspect-video w-full overflow-hidden bg-paper-deep ' + (className ?? '')}
    >
      {width > 0 ? (
        <PosterBackgroundSwatch decoration={decoration} width={width} height={(width * 9) / 16} />
      ) : null}
    </div>
  );
}

/** The platform ADMIN's CRUD screen for the phả đồ background library. */
export function PosterDecorationManager({ initial }: { initial: AdminPosterDecoration[] }) {
  const confirm = useConfirm();
  const showToast = useToast();
  const [decorations, setDecorations] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const shown = decorations.filter((decoration) => decoration.kind === 'BACKGROUND');

  async function reload(): Promise<void> {
    setDecorations(await listPosterDecorations<AdminPosterDecoration>());
  }

  async function save(): Promise<void> {
    if (!draft) return;
    const insetsError = insetsProblem(draft.insets);
    if (insetsError) {
      showToast({ kind: 'error', message: insetsError });
      return;
    }
    if (draft.file && draft.file.size > MAX_DECORATION_IMAGE_BYTES) {
      showToast({ kind: 'error', message: 'Ảnh vượt quá dung lượng tối đa 4 MB.' });
      return;
    }

    setSaving(true);
    try {
      const image = draft.file
        ? { contentType: draft.file.type, data: await readAsBase64(draft.file) }
        : undefined;
      const options = {
        name: draft.name.trim(),
        isActive: draft.isActive,
        ...(draft.sortOrder.trim() === '' ? {} : { sortOrder: Number(draft.sortOrder) }),
        backgroundMode: draft.backgroundMode,
        insets: insetsToSave(draft.insets),
        nameArea: draft.nameArea,
        leftTextArea: draft.leftTextArea,
        rightTextArea: draft.rightTextArea,
      };

      if (draft.id) {
        await updatePosterDecoration(draft.id, { ...options, ...(image ? { image } : {}) });
      } else if (image) {
        await createPosterDecoration({ ...options, kind: 'BACKGROUND', image });
      }
      await reload();
      setDraft(null);
      showToast({ kind: 'success', message: 'Đã lưu hình nền.' });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'lưu hình nền') });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(decoration: AdminPosterDecoration): Promise<void> {
    setBusyId(decoration.id);
    try {
      await updatePosterDecoration(decoration.id, { isActive: !decoration.isActive });
      await reload();
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'cập nhật hình nền') });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(decoration: AdminPosterDecoration): Promise<void> {
    const warning =
      decoration.usageCount > 0
        ? `Hình nền “${decoration.name}” đang được ${decoration.usageCount} dòng họ sử dụng. Các dòng họ này sẽ chuyển về giấy trơn. Xóa hình nền?`
        : `Xóa hình nền “${decoration.name}”?`;
    if (
      !(await confirm({
        title: `Xóa hình nền “${decoration.name}”?`,
        message: decoration.usageCount > 0 ? warning : undefined,
        confirmLabel: 'Xóa',
        tone: 'danger',
      }))
    )
      return;

    setBusyId(decoration.id);
    try {
      await deletePosterDecoration(decoration.id);
      await reload();
      if (draft?.id === decoration.id) setDraft(null);
      showToast({ kind: 'success', message: 'Đã xóa hình nền.' });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'xóa hình nền') });
    } finally {
      setBusyId(null);
    }
  }

  if (draft) {
    return (
      <BackgroundEditor
        draft={draft}
        saved={shown.find((decoration) => decoration.id === draft.id)}
        saving={saving}
        onChange={setDraft}
        onCancel={() => setDraft(null)}
        onSubmit={() => void save()}
      />
    );
  }

  const activeCount = shown.filter((decoration) => decoration.isActive).length;
  return (
    <SectionCard
      icon={<ImageIcon aria-hidden="true" />}
      title="Thư viện hình nền phả đồ"
      description={`${shown.length} hình nền · ${activeCount} đang hiển thị cho trưởng họ.`}
      actions={
        <Button type="button" onClick={() => setDraft(draftFor())}>
          <Plus className="size-4" aria-hidden="true" />
          Thêm hình nền
        </Button>
      }
    >
      {shown.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
          <ImagePlus className="size-8 text-stone-400" aria-hidden="true" />
          <p className="text-sm text-stone-500">Chưa có hình nền nào.</p>
          <Button type="button" variant="outline" onClick={() => setDraft(draftFor())}>
            <Plus className="size-4" aria-hidden="true" />
            Thêm hình nền đầu tiên
          </Button>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((decoration) => (
            <li
              key={decoration.id}
              className="group grid overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => setDraft(draftFor(decoration))}
                className="relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-700"
                aria-label={`Sửa hình nền ${decoration.name}`}
              >
                <FittedSwatch
                  decoration={decoration}
                  className={decoration.isActive ? '' : 'opacity-50 grayscale'}
                />
                {decoration.isActive ? null : (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-stone-900/75 px-2.5 py-1 text-xs font-medium text-white">
                    <EyeOff className="size-3" aria-hidden="true" />
                    Đang ẩn
                  </span>
                )}
              </button>
              <div className="grid gap-3 p-4">
                <p className="truncate font-medium text-brand-950" title={decoration.name}>
                  {decoration.name}
                </p>
                <p className="text-xs text-stone-500">
                  Thứ tự {decoration.sortOrder} · {decoration.usageCount} dòng họ đang dùng
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDraft(draftFor(decoration))}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                    Sửa
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === decoration.id}
                    onClick={() => void toggleActive(decoration)}
                  >
                    {decoration.isActive ? (
                      <EyeOff className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Eye className="size-3.5" aria-hidden="true" />
                    )}
                    {decoration.isActive ? 'Ẩn' : 'Hiện'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-red-700 hover:bg-red-50 hover:text-red-800"
                    disabled={busyId === decoration.id}
                    onClick={() => void remove(decoration)}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Xóa
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
