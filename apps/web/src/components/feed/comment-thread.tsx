'use client';

import { CornerDownRight, SendHorizontal, X } from 'lucide-react';
import { forwardRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { InlineLoader } from '@/components/ui/heritage-loader';
import { NameAvatar, timeAgo } from '@/components/feed/feed-format';
import { ReactionButton, ReactionIcons } from '@/components/feed/reactions';
import { setViewerName, useViewerName } from '@/components/feed/use-viewer-name';
import type { FeedComment, FeedReactionType } from '@/lib/feed-api';
import { cn } from '@/lib/utils';

/** Top-level comments shown before "Xem các bình luận trước". */
const COLLAPSED_COMMENTS = 2;

export type ReplyTarget = { id: string; name: string };

export type CommentActions = {
  canModerate: boolean;
  onReact: (comment: FeedComment, next: FeedReactionType | null) => void;
  onReply: (target: ReplyTarget) => void;
  onEdit: (comment: FeedComment, content: string) => Promise<boolean>;
  onDelete: (comment: FeedComment) => void;
};

const textareaClass =
  'field-sizing-content max-h-40 min-h-10 w-full resize-none rounded-2xl bg-stone-100 px-3.5 py-2 text-base leading-6 text-stone-900 outline-none placeholder:text-stone-500 focus:bg-stone-50 focus:ring-2 focus:ring-brand-700/20 sm:text-[15px]';

function CommentItem({
  comment,
  actions,
  isReply,
}: {
  comment: FeedComment;
  actions: CommentActions;
  isReply: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [saving, setSaving] = useState(false);

  async function saveEdit(): Promise<void> {
    if (!draft.trim()) return;
    setSaving(true);
    if (await actions.onEdit(comment, draft)) setEditing(false);
    setSaving(false);
  }

  return (
    <div className="ui-backdrop flex gap-2">
      <NameAvatar
        name={comment.authorName}
        className={isReply ? 'size-7 text-xs' : 'size-8 text-sm'}
      />
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="grid gap-1.5">
            <textarea
              className={textareaClass}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={2000}
              autoFocus
              rows={1}
            />
            <div className="flex gap-3 px-2 text-xs font-semibold">
              <button
                type="button"
                className="text-stone-500 hover:underline"
                onClick={() => setEditing(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="text-brand-800 hover:underline disabled:opacity-50"
                disabled={saving || !draft.trim()}
                onClick={() => void saveEdit()}
              >
                {saving ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative inline-block max-w-full">
            <div className="rounded-2xl bg-stone-100 px-3 py-2">
              <p className="text-[13px] font-semibold text-stone-900">{comment.authorName}</p>
              <p className="whitespace-pre-line break-words text-[15px] leading-snug text-stone-800">
                {comment.replyToName ? (
                  <span className="font-semibold text-brand-800">{comment.replyToName} </span>
                ) : null}
                {comment.content}
              </p>
            </div>
            {comment.reactions.total > 0 ? (
              <span className="absolute -bottom-2.5 right-1 flex items-center gap-1 rounded-full bg-white py-0.5 pl-0.5 pr-1.5 text-xs text-stone-600 shadow-sm ring-1 ring-stone-200">
                <ReactionIcons summary={comment.reactions} max={2} />
                {comment.reactions.total}
              </span>
            ) : null}
          </div>
        )}

        {editing ? null : (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 text-xs text-stone-500">
            <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
            <ReactionButton
              variant="comment"
              mine={comment.reactions.mine}
              onChange={(next) => actions.onReact(comment, next)}
            />
            <button
              type="button"
              className="font-semibold text-stone-600 hover:underline"
              onClick={() => actions.onReply({ id: comment.id, name: comment.authorName })}
            >
              Phản hồi
            </button>
            {comment.editedAt ? <span>Đã chỉnh sửa</span> : null}
            {comment.isMine ? (
              <button
                type="button"
                className="font-semibold text-stone-600 hover:underline"
                onClick={() => {
                  setDraft(comment.content);
                  setEditing(true);
                }}
              >
                Sửa
              </button>
            ) : null}
            {comment.isMine || actions.canModerate ? (
              <button
                type="button"
                className="font-semibold text-stone-600 hover:text-red-700 hover:underline"
                onClick={() => actions.onDelete(comment)}
              >
                Xóa
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/** Top-level comments with their replies indented below, Facebook-style. */
export function CommentList({
  comments,
  actions,
}: {
  comments: FeedComment[];
  actions: CommentActions;
}) {
  const [showAll, setShowAll] = useState(false);
  const [openReplies, setOpenReplies] = useState<ReadonlySet<string>>(() => new Set());
  const topLevel = comments.filter((comment) => !comment.parentId);
  const repliesOf = (id: string) => comments.filter((comment) => comment.parentId === id);
  const hidden = showAll ? 0 : Math.max(0, topLevel.length - COLLAPSED_COMMENTS);
  const shown = topLevel.slice(hidden);

  if (topLevel.length === 0) return null;
  return (
    <div className="grid gap-3">
      {hidden > 0 ? (
        <button
          type="button"
          className="justify-self-start text-sm font-semibold text-stone-600 hover:underline"
          onClick={() => setShowAll(true)}
        >
          Xem {hidden} bình luận trước
        </button>
      ) : null}
      {shown.map((comment) => {
        const replies = repliesOf(comment.id);
        // One reply shows straight away; longer threads wait for a tap.
        const repliesOpen = replies.length <= 1 || openReplies.has(comment.id);
        return (
          <div key={comment.id} className="grid gap-2">
            <CommentItem comment={comment} actions={actions} isReply={false} />
            {replies.length > 0 ? (
              <div className="ml-10 grid gap-2 border-l-2 border-stone-100 pl-2">
                {repliesOpen ? (
                  replies.map((reply) => (
                    <CommentItem key={reply.id} comment={reply} actions={actions} isReply />
                  ))
                ) : (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 justify-self-start text-sm font-semibold text-stone-600 hover:underline"
                    onClick={() => setOpenReplies((current) => new Set(current).add(comment.id))}
                  >
                    <CornerDownRight className="size-4" aria-hidden="true" />
                    Xem {replies.length} phản hồi
                  </button>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** "Viết bình luận…" with the name asked for once, and a reply banner when answering someone. */
export const CommentComposer = forwardRef<
  HTMLTextAreaElement,
  {
    replyTo: ReplyTarget | null;
    onCancelReply: () => void;
    onSubmit: (authorName: string, content: string) => Promise<boolean>;
  }
>(function CommentComposer({ replyTo, onCancelReply, onSubmit }, ref) {
  const savedName = useViewerName();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const authorName = savedName || name.trim();

  async function submit(event?: FormEvent): Promise<void> {
    event?.preventDefault();
    if (!authorName || !content.trim() || sending) return;
    setSending(true);
    if (!savedName) setViewerName(authorName);
    if (await onSubmit(authorName, content)) setContent('');
    setSending(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    // A keyboard's Enter sends, as on Facebook; phones keep Enter for new lines.
    if (event.key === 'Enter' && !event.shiftKey && matchMedia('(hover: hover)').matches) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form className="grid gap-1.5" onSubmit={(event) => void submit(event)}>
      {replyTo ? (
        <p className="flex items-center gap-2 pl-10 text-xs text-stone-500">
          Đang trả lời <span className="font-semibold text-stone-700">{replyTo.name}</span>
          <button
            type="button"
            className="grid size-5 place-items-center rounded-full hover:bg-stone-200"
            onClick={onCancelReply}
            aria-label="Hủy trả lời"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </p>
      ) : null}
      {savedName ? null : (
        <input
          className="ml-10 h-9 rounded-full border border-stone-200 bg-white px-3.5 text-base outline-none placeholder:text-stone-400 focus:border-brand-700 sm:text-sm"
          placeholder="Tên của bạn (để mọi người biết ai bình luận)"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          autoComplete="name"
        />
      )}
      <div className="flex items-end gap-2">
        <NameAvatar name={authorName || '?'} className="size-8 text-sm" />
        <div className="relative min-w-0 flex-1">
          <textarea
            ref={ref}
            className={cn(textareaClass, 'pr-11')}
            placeholder={replyTo ? `Trả lời ${replyTo.name}…` : 'Viết bình luận…'}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={2000}
            rows={1}
          />
          <button
            type="submit"
            disabled={!authorName || !content.trim() || sending}
            className="absolute bottom-1 right-1 grid size-8 place-items-center rounded-full text-brand-800 transition hover:bg-brand-50 disabled:text-stone-300"
            aria-label="Gửi bình luận"
          >
            {sending ? (
              <InlineLoader className="size-5" />
            ) : (
              <SendHorizontal className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </form>
  );
});
