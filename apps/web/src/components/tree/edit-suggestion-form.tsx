'use client';

import { CheckCircle2, Send } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import { InlineLoader } from '@/components/ui/heritage-loader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { setViewerName } from '@/components/feed/use-viewer-name';
import { createEditSuggestion, MAX_SUGGESTION_CONTENT_LENGTH } from '@/lib/edit-suggestion-api';
import { isViewerNameFixed, readViewerName } from '@/lib/viewer-identity';

const inputClass =
  'w-full rounded-xl border border-amber-900/20 bg-white px-3 text-base text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/25 sm:text-sm';

/**
 * Proposes a change to one person for the clan head to review. Whoever sends
 * it types their own name, since the whole family signs in with one account.
 */
export function EditSuggestionForm({
  familySlug,
  personId,
  personTitle,
  onCancel,
}: {
  familySlug: string;
  personId: string;
  personTitle: string;
  onCancel: () => void;
}) {
  const id = useId();
  const showToast = useToast();
  // Only opened by a tap, never server-rendered, so storage can be read right away.
  const [proposerName, setProposerName] = useState(readViewerName);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    (nameRef.current?.value ? contentRef : nameRef).current?.focus({ preventScroll: true });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const name = proposerName.trim();
    const text = content.trim();
    if (!name || !text) return;

    setSubmitting(true);
    try {
      await createEditSuggestion(familySlug, personId, { proposerName: name, content: text });
      // The same name the feed posts under, kept per signed-in account.
      setViewerName(name);
      setSent(true);
      showToast({ kind: 'success', message: 'Đã gửi đề xuất đến trưởng họ.' });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'gửi đề xuất') });
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="grid gap-3 rounded-2xl border border-emerald-700/20 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
        <p className="flex items-start gap-2 font-medium">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
          Cảm ơn {proposerName.trim()}! Đề xuất về {personTitle} đã được gửi đến trưởng họ.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setContent('');
              setSent(false);
            }}
          >
            Gửi thêm đề xuất
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Đóng
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-2xl border border-amber-900/15 bg-amber-50/50 px-4 py-4"
      aria-label={`Đề xuất chỉnh sửa thông tin ${personTitle}`}
    >
      <label className="grid gap-1.5" htmlFor={`${id}-name`}>
        <span className="text-sm font-medium text-stone-800">Tên người đề xuất</span>
        <input
          ref={nameRef}
          id={`${id}-name`}
          className={`${inputClass} h-11`}
          value={proposerName}
          readOnly={isViewerNameFixed()}
          onChange={(event) => setProposerName(event.target.value)}
          placeholder="Ví dụ: Nguyễn Văn Bình (con ông Toàn)"
          autoComplete="name"
          maxLength={100}
          required
        />
      </label>
      <label className="grid gap-1.5" htmlFor={`${id}-content`}>
        <span className="text-sm font-medium text-stone-800">Nội dung đề xuất</span>
        <textarea
          ref={contentRef}
          id={`${id}-content`}
          className={`${inputClass} min-h-28 resize-y py-2.5 leading-6`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Ví dụ: Ngày mất đúng là 12/3 âm lịch; cụ an táng tại nghĩa trang làng Đông."
          maxLength={MAX_SUGGESTION_CONTENT_LENGTH}
          required
        />
        <span className="text-right text-xs text-stone-500">
          {content.length}/{MAX_SUGGESTION_CONTENT_LENGTH}
        </span>
      </label>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Huỷ
        </Button>
        <Button type="submit" disabled={submitting || !proposerName.trim() || !content.trim()}>
          {submitting ? (
            <InlineLoader className="size-4" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          {submitting ? 'Đang gửi…' : 'Gửi đề xuất'}
        </Button>
      </div>
    </form>
  );
}
