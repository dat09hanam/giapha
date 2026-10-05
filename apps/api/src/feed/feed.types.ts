import type { FeedReactionType } from '@prisma/client';

export type FeedReactionSummary = {
  /** Count per reaction type; types nobody chose are left out. */
  counts: Partial<Record<FeedReactionType, number>>;
  total: number;
  /** This device's reaction, if any. */
  mine: FeedReactionType | null;
  /** A few reactor names, newest first, for "Bình và 3 người khác". */
  names: string[];
};

export type FeedCommentResponse = {
  id: string;
  /** The top-level comment this replies to; null for a top-level comment. */
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
  /** Oldest first, replies right after their parent's other replies. */
  comments: FeedCommentResponse[];
};

export type FeedPageResponse = {
  posts: FeedPostResponse[];
  /** Pass back as `cursor` for the next page; null on the last page. */
  nextCursor: string | null;
  /** Whether this viewer is the clan head, who may delete anything. */
  canModerate: boolean;
};
