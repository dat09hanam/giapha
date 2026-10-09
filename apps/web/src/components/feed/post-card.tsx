'use client';

import { MessageCircle, MoreHorizontal, PencilLine, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  CommentComposer,
  CommentList,
  type CommentActions,
  type ReplyTarget,
} from '@/components/feed/comment-thread';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { NameAvatar, timeAgo } from '@/components/feed/feed-format';
import { ImageLightbox, PostImages } from '@/components/feed/post-images';
import {
  applyReaction,
  ReactionButton,
  ReactionIcons,
  reactionNamesText,
} from '@/components/feed/reactions';
import { useViewerName } from '@/components/feed/use-viewer-name';
import { Button } from '@/components/ui/button';
import { Presence } from '@/components/ui/presence';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  createFeedComment,
  deleteFeedComment,
  deleteFeedPost,
  removeFeedReaction,
  setFeedReaction,
  updateFeedComment,
  updateFeedPost,
  type FeedComment,
  type FeedPost,
  type FeedReactionType,
} from '@/lib/feed-api';
import { cn } from '@/lib/utils';

/** Longer posts fold after this many characters until "Xem thêm". */
const FOLD_AT = 280;

export function PostCard({
  post,
  familySlug,
  canModerate,
  onChange,
  onDelete,
}: {
  post: FeedPost;
  familySlug: string;
  canModerate: boolean;
  onChange: (post: FeedPost) => void;
  onDelete: (postId: string) => void;
}) {
  const confirm = useConfirm();
  const showToast = useToast();
  const viewerName = useViewerName();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  // Always the latest post, for updates that land after another one.
  const postRef = useRef(post);
  postRef.current = post;

  const canDelete = post.isMine || canModerate;
  const folded = !expanded && post.content.length > FOLD_AT;
  const bigText =
    post.images.length === 0 && post.content.length < 90 && !post.content.includes('\n');
  const reactorName = viewerName || 'Thành viên';

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent): void => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  function fail(error: unknown, action: string): void {
    showToast({ kind: 'error', message: getApiErrorMessage(error, action) });
  }

  async function reactToPost(next: FeedReactionType | null): Promise<void> {
    const before = postRef.current;
    onChange({ ...before, reactions: applyReaction(before.reactions, next, reactorName) });
    try {
      const target = { kind: 'post', id: post.id } as const;
      const reactions = next
        ? await setFeedReaction(familySlug, target, next, reactorName)
        : await removeFeedReaction(familySlug, target);
      onChange({ ...postRef.current, reactions });
    } catch (error) {
      onChange({ ...postRef.current, reactions: before.reactions });
      fail(error, 'bày tỏ cảm xúc');
    }
  }

  function replaceComment(id: string, update: (comment: FeedComment) => FeedComment): void {
    const current = postRef.current;
    onChange({
      ...current,
      comments: current.comments.map((comment) => (comment.id === id ? update(comment) : comment)),
    });
  }

  const commentActions: CommentActions = {
    canModerate,
    onReact: (comment, next) => {
      const before = comment.reactions;
      replaceComment(comment.id, (current) => ({
        ...current,
        reactions: applyReaction(current.reactions, next, reactorName),
      }));
      const target = { kind: 'comment', id: comment.id } as const;
      (next
        ? setFeedReaction(familySlug, target, next, reactorName)
        : removeFeedReaction(familySlug, target)
      )
        .then((reactions) => replaceComment(comment.id, (current) => ({ ...current, reactions })))
        .catch((error: unknown) => {
          replaceComment(comment.id, (current) => ({ ...current, reactions: before }));
          fail(error, 'bày tỏ cảm xúc');
        });
    },
    onReply: (target) => {
      setReplyTo(target);
      setCommentsOpen(true);
      requestAnimationFrame(() => commentInputRef.current?.focus());
    },
    onEdit: async (comment, content) => {
      try {
        const updated = await updateFeedComment(familySlug, comment.id, content);
        replaceComment(comment.id, () => updated);
        return true;
      } catch (error) {
        fail(error, 'sửa bình luận');
        return false;
      }
    },
    onDelete: async (comment) => {
      if (!(await confirm({ title: 'Xóa bình luận này?', confirmLabel: 'Xóa', tone: 'danger' }))) {
        return;
      }
      deleteFeedComment(familySlug, comment.id)
        .then(() => {
          const current = postRef.current;
          // Its replies go with it, on the server and here.
          onChange({
            ...current,
            comments: current.comments.filter(
              (entry) => entry.id !== comment.id && entry.parentId !== comment.id,
            ),
          });
        })
        .catch((error: unknown) => fail(error, 'xóa bình luận'));
    },
  };

  async function submitComment(authorName: string, content: string): Promise<boolean> {
    try {
      const created = await createFeedComment(familySlug, post.id, {
        authorName,
        content,
        ...(replyTo ? { replyToId: replyTo.id } : {}),
      });
      const current = postRef.current;
      onChange({ ...current, comments: [...current.comments, created] });
      setReplyTo(null);
      return true;
    } catch (error) {
      fail(error, 'gửi bình luận');
      return false;
    }
  }

  async function saveEdit(): Promise<void> {
    setSaving(true);
    try {
      onChange(await updateFeedPost(familySlug, post.id, draft));
      setEditing(false);
    } catch (error) {
      fail(error, 'sửa bài viết');
    } finally {
      setSaving(false);
    }
  }

  async function removePost(): Promise<void> {
    setMenuOpen(false);
    if (
      !(await confirm({
        title: 'Xóa bài viết này?',
        message: 'Bình luận và ảnh trong bài cũng sẽ bị xóa.',
        confirmLabel: 'Xóa',
        tone: 'danger',
      }))
    )
      return;
    try {
      await deleteFeedPost(familySlug, post.id);
      onDelete(post.id);
    } catch (error) {
      fail(error, 'xóa bài viết');
    }
  }

  const commentCount = post.comments.length;
  const showComments = commentsOpen || commentCount > 0;

  return (
    <article className="ui-dialog surface mx-3 sm:mx-0">
      <header className="flex items-center gap-2.5 px-4 pt-3">
        <NameAvatar name={post.authorName} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-stone-900">{post.authorName}</p>
          <p className="text-xs text-stone-500">
            <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
            {post.editedAt ? ' · Đã chỉnh sửa' : null}
          </p>
        </div>
        {post.isMine || canDelete ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              className="grid size-9 place-items-center rounded-full text-stone-500 hover:bg-stone-100"
              aria-label="Tùy chọn bài viết"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="ui-dialog absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-xl"
              >
                {post.isMine ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-stone-50"
                    onClick={() => {
                      setDraft(post.content);
                      setEditing(true);
                      setMenuOpen(false);
                    }}
                  >
                    <PencilLine className="size-4" aria-hidden="true" />
                    Chỉnh sửa bài viết
                  </button>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm text-red-700 hover:bg-red-50"
                    onClick={() => void removePost()}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Xóa bài viết
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      {editing ? (
        <div className="grid gap-2 px-4 pt-3">
          <textarea
            className="field-sizing-content min-h-24 w-full resize-none rounded-xl border border-stone-200 px-3 py-2 text-base leading-6 outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={5000}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || (!draft.trim() && post.images.length === 0)}
              onClick={() => void saveEdit()}
            >
              {saving ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </div>
        </div>
      ) : post.content ? (
        <p
          className={cn(
            'whitespace-pre-line break-words px-4 pt-2.5 text-stone-900',
            bigText ? 'text-2xl leading-snug' : 'text-[15px] leading-relaxed',
          )}
        >
          {folded ? `${post.content.slice(0, FOLD_AT - 30).trimEnd()}… ` : post.content}
          {folded ? (
            <button
              type="button"
              className="font-semibold text-stone-600 hover:underline"
              onClick={() => setExpanded(true)}
            >
              Xem thêm
            </button>
          ) : null}
        </p>
      ) : null}

      {post.images.length > 0 ? (
        <div className="mt-3">
          <PostImages images={post.images} familySlug={familySlug} onOpen={setLightboxIndex} />
        </div>
      ) : null}

      {post.reactions.total > 0 || commentCount > 0 ? (
        <div className="flex items-center justify-between gap-3 px-4 pt-2.5 text-sm text-stone-500">
          {post.reactions.total > 0 ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <ReactionIcons summary={post.reactions} />
              <span className="truncate">{reactionNamesText(post.reactions)}</span>
            </span>
          ) : (
            <span />
          )}
          {commentCount > 0 ? (
            <button
              type="button"
              className="shrink-0 hover:underline"
              onClick={() => setCommentsOpen(true)}
            >
              {commentCount} bình luận
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mx-4 mt-2 flex border-y border-stone-200 py-1">
        <ReactionButton
          variant="post"
          mine={post.reactions.mine}
          onChange={(next) => void reactToPost(next)}
        />
        <button
          type="button"
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-[15px] font-semibold text-stone-600 transition hover:bg-stone-100 active:scale-95"
          onClick={() => {
            setCommentsOpen(true);
            requestAnimationFrame(() => commentInputRef.current?.focus());
          }}
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          Bình luận
        </button>
      </div>

      {showComments ? (
        <div className="grid gap-3 px-4 py-3">
          <CommentList comments={post.comments} actions={commentActions} />
          <CommentComposer
            ref={commentInputRef}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onSubmit={submitComment}
          />
        </div>
      ) : (
        <div className="h-1" />
      )}

      <Presence>
        {lightboxIndex !== null ? (
          <ImageLightbox
            images={post.images}
            familySlug={familySlug}
            startIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        ) : null}
      </Presence>
    </article>
  );
}
