'use client';

import { Eye, EyeOff, ImagePlus, LoaderCircle, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { Field } from '@/components/auth/form-fields';
import { hasTreeArea, NO_TREE_AREA, PosterAreaEditor } from '@/components/admin/poster-area-editor';
import { PosterBackgroundSwatch } from '@/components/tree/poster-art';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/lib/poster-decorations';

type Draft = {
  /** Null while adding a new background. */
  id: string | null;
  builtin: boolean;
  name: string;
  sortOrder: string;
  isActive: boolean;
  backgroundMode: PosterBackgroundMode;
  insets: PosterInsets;
  nameArea: PosterNameArea | null;
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
      <legend className="text-sm font-medium text-emerald-950">{legend}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {INSET_EDGES.map(({ edge, label }) => (
          <label key={edge} className="grid gap-1 text-xs text-stone-600">
            {label} (%)
            <input
              type="number"
              min={0}
              max={MAX_INSET_PERCENT}
              step={1}
              value={insets[edge]}
              onChange={(event) => {
                const value = Math.round(Number(event.currentTarget.value));
                onChange({
                  ...insets,
                  [edge]: Number.isFinite(value)
                    ? Math.min(MAX_INSET_PERCENT, Math.max(0, value))
                    : 0,
                });
              }}
              className="h-10 rounded-xl border bg-white px-3 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
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
    builtin: Boolean(decoration?.builtinKey),
    name: decoration?.name ?? '',
    sortOrder: decoration ? String(decoration.sortOrder) : '',
    isActive: decoration?.isActive ?? true,
    backgroundMode: decoration?.backgroundMode ?? 'STRETCH',
    insets: decoration?.insets ?? NO_TREE_AREA,
    nameArea: decoration?.nameArea ?? null,
    file: null,
    imageUrl: decoration?.imageUrl ?? null,
  };
}

const checkboxClass = 'size-4 rounded border-stone-300 accent-emerald-800';
const selectClass =
  'h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15';

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
    builtinKey: saved?.builtinKey ?? null,
    imageUrl: previewUrl ?? draft.imageUrl,
    isActive: draft.isActive,
    sortOrder: Number(draft.sortOrder) || 0,
    backgroundMode: draft.backgroundMode,
    insets: draft.insets,
    nameArea: draft.nameArea,
  };
  const canPreview = Boolean(sample.builtinKey || sample.imageUrl);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      className="grid gap-4 rounded-2xl border border-emerald-900/15 bg-emerald-50/40 p-4"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-emerald-950">
          {draft.id ? 'Sửa hình nền' : 'Thêm hình nền mới'}
        </h3>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel} aria-label="Đóng">
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {!draft.builtin && canPreview ? (
        <PosterAreaEditor
          background={sample}
          treeArea={draft.insets}
          nameArea={draft.nameArea}
          onTreeAreaChange={(insets) => onChange({ ...draft, insets })}
          onNameAreaChange={(nameArea) => onChange({ ...draft, nameArea })}
        />
      ) : (
        <div className="grid h-36 place-items-center overflow-hidden rounded-xl border bg-[#fff6c9]">
          {canPreview ? (
            <PosterBackgroundSwatch decoration={sample} width={231} height={130} />
          ) : (
            <span className="text-sm text-stone-500">Chọn ảnh để xem trước</span>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="decoration-name"
          label="Tên hình nền"
          value={draft.name}
          onChange={(event) => onChange({ ...draft, name: event.currentTarget.value })}
          maxLength={100}
          required
        />
        <Field
          id="decoration-order"
          label="Thứ tự hiển thị"
          type="number"
          min={0}
          max={9999}
          value={draft.sortOrder}
          onChange={(event) => onChange({ ...draft, sortOrder: event.currentTarget.value })}
          hint="Số nhỏ hiện trước. Để trống khi thêm mới để xếp cuối."
        />
      </div>

      {draft.builtin ? (
        <p className="text-sm text-stone-600">
          Hình nền có sẵn được vẽ bằng mã nên chỉ đổi được tên, thứ tự và trạng thái hiển thị.
        </p>
      ) : (
        <>
          <label className="grid gap-1.5" htmlFor="decoration-image">
            <span className="text-sm font-medium text-emerald-950">
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
              className="rounded-xl border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-900 file:px-3 file:py-1.5 file:text-white"
            />
            <span className="text-xs text-stone-500">
              PNG, JPG hoặc WEBP, tối đa 4 MB. Nên vẽ sẵn toàn bộ hoa văn, tỉ lệ 16:9.
            </span>
          </label>

          <label className="grid gap-1.5" htmlFor="decoration-mode">
            <span className="text-sm font-medium text-emerald-950">Cách trải ảnh nền</span>
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
              <option value="STRETCH">Kéo giãn vừa tờ (giữ khung viền sát mép)</option>
              <option value="COVER">Phủ kín cả tờ (có thể cắt bớt mép ảnh)</option>
              <option value="TILE">Lát lặp lại (cho hoa văn nhỏ, không có khung)</option>
            </select>
          </label>

          <InsetFields
            legend="Chỉnh chính xác vùng đặt cây"
            hint="Khoảng cách từ mỗi mép ảnh tới khung đặt cây, tính theo phần trăm chiều cao/chiều rộng. Để cả bốn ô bằng 0 nếu ảnh không có vùng đặt cây."
            insets={draft.insets}
            onChange={(insets) => onChange({ ...draft, insets })}
          />
        </>
      )}

      <label className="flex items-center gap-2 text-sm text-emerald-950">
        <input
          type="checkbox"
          className={checkboxClass}
          checked={draft.isActive}
          onChange={(event) => onChange({ ...draft, isActive: event.currentTarget.checked })}
        />
        Hiển thị cho trưởng họ lựa chọn
      </label>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Hủy
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {saving ? 'Đang lưu…' : draft.id ? 'Lưu thay đổi' : 'Thêm hình nền'}
        </Button>
      </div>
    </form>
  );
}

/** The platform ADMIN's CRUD screen for the phả đồ background library. */
export function PosterDecorationManager({ initial }: { initial: AdminPosterDecoration[] }) {
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
    const insetsError = draft.builtin ? null : insetsProblem(draft.insets);
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
        ...(draft.builtin
          ? {}
          : {
              backgroundMode: draft.backgroundMode,
              insets: insetsToSave(draft.insets),
              nameArea: draft.nameArea,
            }),
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
    if (!window.confirm(warning)) return;

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

  return (
    <Card className="bg-white/80 shadow-sm">
      <CardHeader>
        <span className="grid size-11 place-items-center rounded-2xl bg-rose-100 text-rose-900">
          <ImagePlus className="size-5" aria-hidden="true" />
        </span>
        <CardTitle className="mt-4 text-xl">Thư viện hình nền phả đồ</CardTitle>
        <p className="text-sm leading-6 text-stone-600">
          Các hình nền đang hiển thị sẽ xuất hiện trong mục “Hình nền phả đồ” của trưởng họ. Hình
          nền có sẵn không thể xóa nhưng có thể ẩn.
        </p>
      </CardHeader>
      <CardContent className="grid gap-5">
        {draft ? (
          <BackgroundEditor
            draft={draft}
            saved={shown.find((decoration) => decoration.id === draft.id)}
            saving={saving}
            onChange={setDraft}
            onCancel={() => setDraft(null)}
            onSubmit={() => void save()}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            className="justify-self-start"
            onClick={() => setDraft(draftFor())}
          >
            <Plus className="size-4" aria-hidden="true" />
            Thêm hình nền
          </Button>
        )}

        {shown.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-stone-500">
            Chưa có hình nền nào.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((decoration) => (
              <li
                key={decoration.id}
                className={
                  'grid gap-3 rounded-2xl border bg-white p-3 ' +
                  (decoration.isActive ? '' : 'opacity-60')
                }
              >
                <div className="grid h-24 place-items-center overflow-hidden rounded-xl bg-[#fff6c9]">
                  <PosterBackgroundSwatch decoration={decoration} width={156} height={88} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-emerald-950">{decoration.name}</span>
                  <Badge variant="outline">
                    {decoration.builtinKey ? 'Có sẵn' : 'Ảnh tải lên'}
                  </Badge>
                  {decoration.isActive ? null : <Badge variant="outline">Đang ẩn</Badge>}
                </div>
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
                  {decoration.builtinKey ? null : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-red-700 hover:text-red-800"
                      disabled={busyId === decoration.id}
                      onClick={() => void remove(decoration)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Xóa
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
