'use client';

import {
  ArrowLeft,
  ExternalLink,
  Eye,
  EyeOff,
  ImageMinus,
  Newspaper,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';

import { InlineLoader } from '@/components/ui/heritage-loader';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { SectionCard } from '@/components/admin/admin-layout';
import { Field } from '@/components/auth/form-fields';
import { RichTextEditor } from '@/components/rich-text/rich-text-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  ARTICLE_SECTIONS,
  MAX_ARTICLE_COVER_BYTES,
  articleCoverSrc,
  articleHref,
  articleSlug,
  createArticle,
  deleteArticle,
  updateArticle,
  type ArticleCoverUpload,
  type ArticleInput,
} from '@/lib/article-api';
import { compressImage } from '@/lib/image-compress';
import { EMPTY_RICH_TEXT, richTextIsEmpty } from '@/lib/rich-text';
import { cn } from '@/lib/utils';
import type { AdminArticle, ArticleCategory } from '@/types/article';
import type { RichTextDocument } from '@/types/rich-text';

type Filter = 'ALL' | ArticleCategory;

type Draft = {
  id: string | null;
  category: ArticleCategory;
  title: string;
  slug: string;
  slugLocked: boolean;
  summary: string;
  content: RichTextDocument;
  isPublished: boolean;
  coverUrl: string | null;
  cover: ArticleCoverUpload | null | undefined;
};

const CATEGORIES: readonly ArticleCategory[] = ['PRAYER', 'LIBRARY'];

const UPDATED_FORMAT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});

function newDraft(category: ArticleCategory): Draft {
  return {
    id: null,
    category,
    title: '',
    slug: '',
    slugLocked: false,
    summary: '',
    content: EMPTY_RICH_TEXT,
    isPublished: false,
    coverUrl: null,
    cover: undefined,
  };
}

function draftOf(article: AdminArticle): Draft {
  return {
    id: article.id,
    category: article.category,
    title: article.title,
    slug: article.slug,
    slugLocked: article.publishedAt !== null,
    summary: article.summary ?? '',
    content: article.content,
    isPublished: article.isPublished,
    coverUrl: article.coverUrl,
    cover: undefined,
  };
}

function inputOf(draft: Draft): ArticleInput {
  return {
    category: draft.category,
    title: draft.title.trim(),
    slug: draft.slug,
    summary: draft.summary.trim() || null,
    content: draft.content,
    isPublished: draft.isPublished,
    ...(draft.cover === undefined ? {} : { cover: draft.cover }),
  };
}

function capitalizeWords(text: string): string {
  return text.replace(
    /(^|[\s([{"'“‘])(\p{Ll})/gu,
    (_, space: string, letter: string) => space + letter.toLocaleUpperCase('vi'),
  );
}

type SlugStatus = 'empty' | 'taken' | 'free';

function ArticleEditor({
  draft,
  articles,
  onChange,
  onCancel,
  onSaved,
}: {
  draft: Draft;
  articles: readonly AdminArticle[];
  onChange: (draft: Draft) => void;
  onCancel: () => void;
  onSaved: (article: AdminArticle) => void;
}) {
  const showToast = useToast();
  const [saving, setSaving] = useState(false);
  const [preparingCover, setPreparingCover] = useState(false);
  const section = ARTICLE_SECTIONS[draft.category];
  const titleRef = useRef<HTMLInputElement>(null);

  const slugStatus: SlugStatus =
    draft.slug.length < 2
      ? 'empty'
      : articles.some(
            (item) =>
              item.id !== draft.id && item.category === draft.category && item.slug === draft.slug,
          )
        ? 'taken'
        : 'free';

  function changeTitle(input: HTMLInputElement, composing: boolean): void {
    const title = composing ? input.value : capitalizeWords(input.value);
    const { selectionStart, selectionEnd } = input;
    onChange({ ...draft, title, slug: draft.slugLocked ? draft.slug : articleSlug(title) });
    if (title !== input.value) {
      requestAnimationFrame(() =>
        titleRef.current?.setSelectionRange(selectionStart, selectionEnd),
      );
    }
  }

  function setPreview(coverUrl: string | null, cover: Draft['cover']): void {
    if (draft.coverUrl?.startsWith('blob:')) URL.revokeObjectURL(draft.coverUrl);
    onChange({ ...draft, coverUrl, cover });
  }

  async function pickCover(file: File | undefined): Promise<void> {
    if (!file) return;
    setPreparingCover(true);
    try {
      const image = await compressImage(file, MAX_ARTICLE_COVER_BYTES, { maxEdge: 1600 });
      setPreview(image.previewUrl, { contentType: image.contentType, data: image.data });
    } catch (error: unknown) {
      showToast({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Không đọc được ảnh này.',
      });
    } finally {
      setPreparingCover(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (slugStatus !== 'free') {
      showToast({
        kind: 'error',
        message:
          slugStatus === 'taken'
            ? 'Đường dẫn này đã có bài viết khác dùng. Hãy đổi tiêu đề.'
            : 'Tiêu đề cần có chữ hoặc số để tạo đường dẫn.',
      });
      return;
    }
    if (richTextIsEmpty(draft.content)) {
      showToast({ kind: 'error', message: 'Bài viết cần có nội dung.' });
      return;
    }
    setSaving(true);
    try {
      const input = inputOf(draft);
      const saved = draft.id ? await updateArticle(draft.id, input) : await createArticle(input);
      if (draft.coverUrl?.startsWith('blob:')) URL.revokeObjectURL(draft.coverUrl);
      showToast({
        kind: 'success',
        message: saved.isPublished ? 'Đã lưu và đăng bài viết.' : 'Đã lưu bản nháp.',
      });
      onSaved(saved);
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'lưu bài viết') });
    } finally {
      setSaving(false);
    }
  }

  const cover = articleCoverSrc(draft.coverUrl);

  return (
    <SectionCard
      icon={<Pencil aria-hidden="true" />}
      title={draft.id ? 'Sửa bài viết' : 'Viết bài mới'}
      actions={
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Quay lại danh sách
        </Button>
      }
      footer={
        <>
          <label className="flex items-center gap-2 text-sm font-medium text-stone-700 sm:mr-auto">
            <input
              type="checkbox"
              className="size-4 accent-brand-700"
              checked={draft.isPublished}
              onChange={(event) => onChange({ ...draft, isPublished: event.currentTarget.checked })}
            />
            Đăng công khai
          </label>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Huỷ
          </Button>
          <Button
            type="submit"
            form="article-editor"
            disabled={saving || preparingCover || slugStatus === 'taken'}
          >
            {saving ? (
              <InlineLoader className="size-4" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {saving ? 'Đang lưu…' : draft.isPublished ? 'Lưu và đăng' : 'Lưu bản nháp'}
          </Button>
        </>
      }
    >
      <form id="article-editor" className="grid gap-5" onSubmit={submit}>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-brand-950">Mục</span>
          <Segmented
            label="Mục của bài viết"
            className="sm:max-w-md"
            options={CATEGORIES.map((category) => ({
              value: category,
              label: ARTICLE_SECTIONS[category].label,
            }))}
            value={draft.category}
            onChange={(category) => onChange({ ...draft, category })}
          />
        </div>

        <Field
          ref={titleRef}
          id="article-title"
          label="Tiêu đề"
          value={draft.title}
          onChange={(event) =>
            changeTitle(event.currentTarget, (event.nativeEvent as InputEvent).isComposing ?? false)
          }
          onCompositionEnd={(event) => changeTitle(event.currentTarget, false)}
          onBlur={(event) => changeTitle(event.currentTarget, false)}
          placeholder="Ví dụ: Văn Khấn Ngày Giỗ Thường"
          minLength={2}
          maxLength={200}
          required
        />

        <div className="grid gap-1.5">
          <Field
            id="article-slug"
            label="Đường dẫn"
            value={draft.slug}
            readOnly
            tabIndex={-1}
            placeholder="Tự tạo theo tiêu đề"
            aria-describedby="article-slug-status"
            aria-invalid={slugStatus === 'taken'}
            className={cn(
              'cursor-default bg-stone-50 text-stone-700 focus:ring-0',
              slugStatus === 'free' && 'border-2 border-emerald-600!',
              slugStatus === 'taken' && 'border-2 border-red-600!',
            )}
          />
          <span
            id="article-slug-status"
            className={cn(
              'break-all text-xs',
              slugStatus === 'free' && 'text-emerald-700',
              slugStatus === 'taken' && 'font-medium text-red-700',
              slugStatus === 'empty' && 'text-stone-500',
            )}
          >
            {slugStatus === 'taken'
              ? `Đã có bài viết khác trong mục ${section.label} dùng đường dẫn này. ${draft.slugLocked ? 'Hãy chọn mục khác.' : 'Hãy đổi tiêu đề.'}`
              : slugStatus === 'free'
                ? `Đường dẫn dùng được: ${section.path}/${draft.slug}`
                : 'Tự tạo theo tiêu đề.'}
            {draft.slugLocked
              ? ' Bài đã từng đăng nên giữ nguyên đường dẫn để link cũ không bị hỏng.'
              : ''}
          </span>
        </div>

        <label className="grid gap-1.5" htmlFor="article-summary">
          <span className="text-sm font-medium text-brand-950">Tóm tắt</span>
          <textarea
            id="article-summary"
            rows={3}
            value={draft.summary}
            onChange={(event) => onChange({ ...draft, summary: event.currentTarget.value })}
            maxLength={500}
            placeholder="Một hai câu giới thiệu bài viết, hiện trên thẻ bài và kết quả tìm kiếm Google. Để trống sẽ lấy đoạn đầu bài."
            className="resize-y rounded-lg border border-gold-700/45 bg-[var(--card)] px-3 py-2.5 text-base leading-6 outline-none transition placeholder:text-stone-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm"
          />
        </label>

        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-brand-950">Ảnh bìa</span>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt="Ảnh bìa đã chọn"
                className="aspect-[16/9] w-full rounded-xl border border-gold-500/30 object-cover sm:w-64"
              />
            ) : null}
            <div className="grid gap-2">
              <input
                id="article-cover"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Chọn ảnh bìa"
                onChange={(event) => {
                  void pickCover(event.currentTarget.files?.[0]);
                  event.currentTarget.value = '';
                }}
                className="rounded-xl border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-900 file:px-3 file:py-1.5 file:text-white"
              />
              {cover ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit"
                  onClick={() => setPreview(null, draft.id ? null : undefined)}
                >
                  <ImageMinus className="size-4" aria-hidden="true" />
                  Bỏ ảnh bìa
                </Button>
              ) : null}
              <span className="text-xs leading-5 text-stone-500">
                {preparingCover
                  ? 'Đang xử lý ảnh…'
                  : 'Không bắt buộc. Ảnh ngang tỉ lệ 16:9, JPG, PNG hoặc WEBP.'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-1.5">
          <span id="article-content-label" className="text-sm font-medium text-brand-950">
            Nội dung
          </span>
          <RichTextEditor
            key={draft.id ?? 'new'}
            id="article-content"
            labelledBy="article-content-label"
            initial={draft.content}
            onChange={(content) => onChange({ ...draft, content })}
            placeholder="Viết nội dung bài văn khấn hoặc bài viết…"
          />
        </div>
      </form>
    </SectionCard>
  );
}

export function ArticleManager({ initial }: { initial: readonly AdminArticle[] }) {
  const confirm = useConfirm();
  const showToast = useToast();
  const [articles, setArticles] = useState<readonly AdminArticle[]>(initial);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const shown = filter === 'ALL' ? articles : articles.filter((item) => item.category === filter);

  function replace(saved: AdminArticle): void {
    setArticles((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
  }

  async function togglePublished(article: AdminArticle): Promise<void> {
    setBusyId(article.id);
    try {
      replace(await updateArticle(article.id, { isPublished: !article.isPublished }));
      showToast({
        kind: 'success',
        message: article.isPublished ? 'Đã ẩn bài viết.' : 'Đã đăng bài viết.',
      });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'cập nhật bài viết') });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(article: AdminArticle): Promise<void> {
    if (
      !(await confirm({
        title: `Xoá vĩnh viễn bài viết “${article.title}”?`,
        message: 'Không thể hoàn tác.',
        confirmLabel: 'Xoá',
        tone: 'danger',
      }))
    )
      return;
    setBusyId(article.id);
    try {
      await deleteArticle(article.id);
      setArticles((current) => current.filter((item) => item.id !== article.id));
      showToast({ kind: 'success', message: 'Đã xoá bài viết.' });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'xoá bài viết') });
    } finally {
      setBusyId(null);
    }
  }

  if (draft) {
    return (
      <ArticleEditor
        draft={draft}
        articles={articles}
        onChange={setDraft}
        onCancel={() => {
          if (draft.coverUrl?.startsWith('blob:')) URL.revokeObjectURL(draft.coverUrl);
          setDraft(null);
        }}
        onSaved={(saved) => {
          replace(saved);
          setDraft(null);
        }}
      />
    );
  }

  return (
    <SectionCard
      icon={<Newspaper aria-hidden="true" />}
      title="Bài viết"
      description="Bài của hai mục Mẫu bài cúng và Thư viện trên trang công khai. Bản nháp chỉ quản trị viên thấy; bài đã đăng ai cũng đọc được và được Google tìm thấy."
      actions={
        <Button
          type="button"
          onClick={() => setDraft(newDraft(filter === 'ALL' ? 'PRAYER' : filter))}
        >
          <Plus className="size-4" aria-hidden="true" />
          Viết bài mới
        </Button>
      }
    >
      <div className="grid gap-5">
        <Segmented
          label="Lọc theo mục"
          className="sm:max-w-lg"
          options={[
            { value: 'ALL' as const, label: 'Tất cả', count: articles.length },
            ...CATEGORIES.map((category) => ({
              value: category,
              label: ARTICLE_SECTIONS[category].label,
              count: articles.filter((item) => item.category === category).length,
            })),
          ]}
          value={filter}
          onChange={setFilter}
        />

        {shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gold-500/40 px-4 py-10 text-center text-sm text-stone-500">
            Chưa có bài viết nào. Chọn “Viết bài mới” để bắt đầu.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {shown.map((article) => {
              const busy = busyId === article.id;
              return (
                <li
                  key={article.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{ARTICLE_SECTIONS[article.category].label}</Badge>
                      {article.isPublished ? (
                        <Badge variant="default">Đã đăng</Badge>
                      ) : (
                        <Badge variant="secondary">Bản nháp</Badge>
                      )}
                    </div>
                    <p className="mt-1.5 truncate font-semibold text-stone-900">{article.title}</p>
                    <p className="text-xs text-stone-500">
                      Cập nhật {UPDATED_FORMAT.format(new Date(article.updatedAt))}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDraft(draftOf(article))}
                      disabled={busy}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      Sửa
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void togglePublished(article)}
                      disabled={busy}
                    >
                      {article.isPublished ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                      {article.isPublished ? 'Ẩn' : 'Đăng'}
                    </Button>
                    {article.isPublished ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={articleHref(article.category, article.slug)} target="_blank">
                          <ExternalLink className="size-4" aria-hidden="true" />
                          Xem
                        </Link>
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void remove(article)}
                      disabled={busy}
                      aria-label={`Xoá bài viết ${article.title}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
