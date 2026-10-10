import { apiFetch } from '@/lib/api-error';
import { getDeviceKey } from '@/lib/viewer-identity';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export type FeedReactionType = 'LIKE' | 'LOVE' | 'CARE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

export type FeedReactionSummary = {
  counts: Partial<Record<FeedReactionType, number>>;
  total: number;
  mine: FeedReactionType | null;
  names: string[];
};

export type FeedComment = {
  id: string;
  parentId: string | null;
  authorName: string;
  replyToName: string | null;
  content: string;
  createdAt: string;
  editedAt: string | null;
  isMine: boolean;
  reactions: FeedReactionSummary;
};

export type FeedImage = { url: string; width: number; height: number };

export type FeedPost = {
  id: string;
  authorName: string;
  content: string;
  images: FeedImage[];
  createdAt: string;
  editedAt: string | null;
  isMine: boolean;
  reactions: FeedReactionSummary;
  comments: FeedComment[];
};

export type FeedPage = {
  posts: FeedPost[];
  nextCursor: string | null;
  canModerate: boolean;
};

export type FeedImageUpload = {
  contentType: string;
  data: string;
  width: number;
  height: number;
};

export type ReactionTarget = { kind: 'post' | 'comment'; id: string };

export const MAX_POST_IMAGES = 4;
export const MAX_FEED_IMAGE_BYTES = 1024 * 1024;

function feedUrl(slug: string, path = ''): string {
  return `${API_URL}/families/${encodeURIComponent(slug)}/feed${path}`;
}

function request<T>(url: string, init: RequestInit, action: string): Promise<T> {
  return apiFetch<T>(
    url,
    {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        'X-Feed-Key': getDeviceKey(),
      },
    },
    action,
  );
}

function targetPath(target: ReactionTarget): string {
  return `/${target.kind === 'post' ? 'posts' : 'comments'}/${encodeURIComponent(target.id)}`;
}

export function getFeedPage(slug: string, cursor?: string | null): Promise<FeedPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return request(feedUrl(slug, query), { method: 'GET', cache: 'no-store' }, 'tải bảng tin');
}

export function createFeedPost(
  slug: string,
  input: { authorName: string; content: string; images: FeedImageUpload[] },
): Promise<FeedPost> {
  return request(
    feedUrl(slug, '/posts'),
    { method: 'POST', body: JSON.stringify(input) },
    'đăng bài',
  );
}

export function updateFeedPost(slug: string, postId: string, content: string): Promise<FeedPost> {
  return request(
    feedUrl(slug, `/posts/${encodeURIComponent(postId)}`),
    { method: 'PATCH', body: JSON.stringify({ content }) },
    'sửa bài viết',
  );
}

export function deleteFeedPost(slug: string, postId: string): Promise<void> {
  return request(
    feedUrl(slug, `/posts/${encodeURIComponent(postId)}`),
    { method: 'DELETE' },
    'xóa bài viết',
  );
}

export function createFeedComment(
  slug: string,
  postId: string,
  input: { authorName: string; content: string; replyToId?: string },
): Promise<FeedComment> {
  return request(
    feedUrl(slug, `/posts/${encodeURIComponent(postId)}/comments`),
    { method: 'POST', body: JSON.stringify(input) },
    'gửi bình luận',
  );
}

export function updateFeedComment(
  slug: string,
  commentId: string,
  content: string,
): Promise<FeedComment> {
  return request(
    feedUrl(slug, `/comments/${encodeURIComponent(commentId)}`),
    { method: 'PATCH', body: JSON.stringify({ content }) },
    'sửa bình luận',
  );
}

export function deleteFeedComment(slug: string, commentId: string): Promise<void> {
  return request(
    feedUrl(slug, `/comments/${encodeURIComponent(commentId)}`),
    { method: 'DELETE' },
    'xóa bình luận',
  );
}

export function setFeedReaction(
  slug: string,
  target: ReactionTarget,
  type: FeedReactionType,
  reactorName: string,
): Promise<FeedReactionSummary> {
  return request(
    feedUrl(slug, `${targetPath(target)}/reaction`),
    { method: 'POST', body: JSON.stringify({ type, reactorName }) },
    'bày tỏ cảm xúc',
  );
}

export function removeFeedReaction(
  slug: string,
  target: ReactionTarget,
): Promise<FeedReactionSummary> {
  return request(
    feedUrl(slug, `${targetPath(target)}/reaction`),
    { method: 'DELETE' },
    'bỏ cảm xúc',
  );
}
