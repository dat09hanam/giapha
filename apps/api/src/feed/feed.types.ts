import type { FeedReactionType } from '@prisma/client';

export type FeedReactionSummary = {
  counts: Partial<Record<FeedReactionType, number>>;
  total: number;
  mine: FeedReactionType | null;
  names: string[];
};

export type FeedCommentResponse = {
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

export type FeedPostResponse = {
  id: string;
  authorName: string;
  content: string;
  images: Array<{ url: string; width: number; height: number }>;
  createdAt: string;
  editedAt: string | null;
  isMine: boolean;
  reactions: FeedReactionSummary;
  comments: FeedCommentResponse[];
};

export type FeedPageResponse = {
  posts: FeedPostResponse[];
  nextCursor: string | null;
  canModerate: boolean;
};
