import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FeedReactionType, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service.js';
import { MediaService } from '../media/media.service.js';
import {
  MAX_FEED_IMAGE_BYTES,
  type CreateFeedCommentDto,
  type CreateFeedPostDto,
} from './dto/feed.dto.js';
import type {
  FeedCommentResponse,
  FeedPageResponse,
  FeedPostResponse,
  FeedReactionSummary,
} from './feed.types.js';

const PAGE_SIZE = 10;
/** Names listed under a post's reactions; the rest are a count. */
const REACTOR_NAMES_SHOWN = 3;

const POST_SELECT = {
  id: true,
  authorName: true,
  authorKeyHash: true,
  content: true,
  createdAt: true,
  editedAt: true,
  images: { orderBy: { sortOrder: 'asc' }, select: { url: true, width: true, height: true } },
} satisfies Prisma.FeedPostSelect;

type PostRecord = Prisma.FeedPostGetPayload<{ select: typeof POST_SELECT }>;
type ReactionRecord = {
  postId: string | null;
  commentId: string | null;
  type: FeedReactionType;
  reactorKeyHash: string;
  reactorName: string;
};
type CommentRecord = {
  id: string;
  postId: string;
  parentId: string | null;
  authorName: string;
  authorKeyHash: string;
  replyToName: string | null;
  content: string;
  createdAt: Date;
  editedAt: Date | null;
};

/** Who is acting: their hashed device key, and whether they are the clan head. */
export type FeedActor = { keyHash: string | null; canModerate: boolean };

type ReactionTarget = { postId: string } | { commentId: string };

function summarize(
  reactions: readonly ReactionRecord[],
  keyHash: string | null,
): FeedReactionSummary {
  const counts: Partial<Record<FeedReactionType, number>> = {};
  for (const reaction of reactions) counts[reaction.type] = (counts[reaction.type] ?? 0) + 1;
  return {
    counts,
    total: reactions.length,
    mine: reactions.find((reaction) => reaction.reactorKeyHash === keyHash)?.type ?? null,
    names: reactions.slice(0, REACTOR_NAMES_SHOWN).map((reaction) => reaction.reactorName),
  };
}

function toCommentResponse(
  comment: CommentRecord,
  reactions: readonly ReactionRecord[],
  keyHash: string | null,
): FeedCommentResponse {
  return {
    id: comment.id,
    parentId: comment.parentId,
    authorName: comment.authorName,
    replyToName: comment.replyToName,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    editedAt: comment.editedAt?.toISOString() ?? null,
    isMine: keyHash !== null && comment.authorKeyHash === keyHash,
    reactions: summarize(reactions, keyHash),
  };
}

function cleanName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) throw new BadRequestException('Vui lòng nhập tên của bạn.');
  return trimmed;
}

@Injectable()
export class FeedService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  async getPage(familyId: string, actor: FeedActor, cursor?: string): Promise<FeedPageResponse> {
    const records = await this.prisma.feedPost.findMany({
      where: { familyId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: POST_SELECT,
    });
    const hasMore = records.length > PAGE_SIZE;
    const page = records.slice(0, PAGE_SIZE);
    return {
      posts: await this.buildPosts(familyId, page, actor.keyHash),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
      canModerate: actor.canModerate,
    };
  }

  async createPost(
    familyId: string,
    keyHash: string,
    input: CreateFeedPostDto,
  ): Promise<FeedPostResponse> {
    const authorName = cleanName(input.authorName);
    const content = input.content.trim();
    const images = input.images ?? [];
    if (!content && images.length === 0) {
      throw new BadRequestException('Bài viết cần có nội dung hoặc ít nhất một ảnh.');
    }

    // Files first, so the post never points at a photo that failed to save.
    const stored: string[] = [];
    try {
      for (const image of images) {
        const saved = await this.media.storeImage(
          familyId,
          image.contentType,
          image.data,
          MAX_FEED_IMAGE_BYTES,
        );
        stored.push(saved.url);
      }
      const post = await this.prisma.feedPost.create({
        data: {
          familyId,
          authorName,
          authorKeyHash: keyHash,
          content,
          images: {
            // familyId comes from the post: it is part of the composite key the images hang off,
            // and Prisma rejects it here at runtime even though the types allow it.
            create: images.map((image, index) => ({
              url: stored[index]!,
              width: image.width,
              height: image.height,
              sortOrder: index,
            })),
          },
        },
        select: POST_SELECT,
      });
      const [response] = await this.buildPosts(familyId, [post], keyHash);
      return response!;
    } catch (error) {
      await this.media.removeOwnedFiles(familyId, stored);
      throw error;
    }
  }

  async updatePost(
    familyId: string,
    keyHash: string,
    postId: string,
    content: string,
  ): Promise<FeedPostResponse> {
    const post = await this.findPost(familyId, postId);
    if (post.authorKeyHash !== keyHash) {
      throw new ForbiddenException('Bạn chỉ có thể sửa bài viết đăng từ thiết bị này.');
    }
    const trimmed = content.trim();
    if (!trimmed && post.images.length === 0) {
      throw new BadRequestException('Bài viết cần có nội dung hoặc ít nhất một ảnh.');
    }
    const updated = await this.prisma.feedPost.update({
      where: { id: post.id },
      data: { content: trimmed, editedAt: new Date() },
      select: POST_SELECT,
    });
    const [response] = await this.buildPosts(familyId, [updated], keyHash);
    return response!;
  }

  async deletePost(familyId: string, actor: FeedActor, postId: string): Promise<void> {
    const post = await this.findPost(familyId, postId);
    if (!actor.canModerate && post.authorKeyHash !== actor.keyHash) {
      throw new ForbiddenException('Bạn chỉ có thể xóa bài viết đăng từ thiết bị này.');
    }
    // Comments, replies, reactions and image rows go with it (Cascade).
    await this.prisma.feedPost.delete({ where: { id: post.id } });
    await this.media.removeOwnedFiles(
      familyId,
      post.images.map((image) => image.url),
    );
  }

  async createComment(
    familyId: string,
    keyHash: string,
    postId: string,
    input: CreateFeedCommentDto,
  ): Promise<FeedCommentResponse> {
    const post = await this.findPost(familyId, postId);
    const authorName = cleanName(input.authorName);
    const content = input.content.trim();
    if (!content) throw new BadRequestException('Bình luận chưa có nội dung.');

    let parentId: string | null = null;
    let replyToName: string | null = null;
    if (input.replyToId) {
      const target = await this.prisma.feedComment.findFirst({
        where: { id: input.replyToId, familyId, postId: post.id },
        select: { id: true, parentId: true, authorName: true },
      });
      if (!target) throw new NotFoundException('Không tìm thấy bình luận cần phản hồi.');
      // Replies stay one level deep; answering a reply names its author instead.
      parentId = target.parentId ?? target.id;
      replyToName = target.parentId ? target.authorName : null;
    }

    const comment = await this.prisma.feedComment.create({
      data: {
        familyId,
        postId: post.id,
        parentId,
        replyToName,
        authorName,
        authorKeyHash: keyHash,
        content,
      },
    });
    return toCommentResponse(comment, [], keyHash);
  }

  async updateComment(
    familyId: string,
    keyHash: string,
    commentId: string,
    content: string,
  ): Promise<FeedCommentResponse> {
    const comment = await this.findComment(familyId, commentId);
    if (comment.authorKeyHash !== keyHash) {
      throw new ForbiddenException('Bạn chỉ có thể sửa bình luận viết từ thiết bị này.');
    }
    const trimmed = content.trim();
    if (!trimmed) throw new BadRequestException('Bình luận chưa có nội dung.');
    const updated = await this.prisma.feedComment.update({
      where: { id: comment.id },
      data: { content: trimmed, editedAt: new Date() },
    });
    const reactions = await this.reactionsFor(familyId, { commentId: comment.id });
    return toCommentResponse(updated, reactions, keyHash);
  }

  async deleteComment(familyId: string, actor: FeedActor, commentId: string): Promise<void> {
    const comment = await this.findComment(familyId, commentId);
    if (!actor.canModerate && comment.authorKeyHash !== actor.keyHash) {
      throw new ForbiddenException('Bạn chỉ có thể xóa bình luận viết từ thiết bị này.');
    }
    // Its replies and reactions go with it (Cascade).
    await this.prisma.feedComment.delete({ where: { id: comment.id } });
  }

  async setReaction(
    familyId: string,
    keyHash: string,
    target: ReactionTarget,
    type: FeedReactionType,
    reactorName: string,
  ): Promise<FeedReactionSummary> {
    await this.assertTarget(familyId, target);
    const name = reactorName.trim().replace(/\s+/g, ' ').slice(0, 100) || 'Thành viên';
    await this.prisma.$transaction([
      this.prisma.feedReaction.deleteMany({
        where: { familyId, ...target, reactorKeyHash: keyHash },
      }),
      this.prisma.feedReaction.create({
        data: { familyId, ...target, reactorKeyHash: keyHash, reactorName: name, type },
      }),
    ]);
    return summarize(await this.reactionsFor(familyId, target), keyHash);
  }

  async removeReaction(
    familyId: string,
    keyHash: string,
    target: ReactionTarget,
  ): Promise<FeedReactionSummary> {
    await this.assertTarget(familyId, target);
    await this.prisma.feedReaction.deleteMany({
      where: { familyId, ...target, reactorKeyHash: keyHash },
    });
    return summarize(await this.reactionsFor(familyId, target), keyHash);
  }

  /** Posts with their comments and every reaction, gathered in three queries. */
  private async buildPosts(
    familyId: string,
    posts: readonly PostRecord[],
    keyHash: string | null,
  ): Promise<FeedPostResponse[]> {
    if (posts.length === 0) return [];
    const postIds = posts.map((post) => post.id);
    const comments = await this.prisma.feedComment.findMany({
      where: { familyId, postId: { in: postIds } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const commentIds = comments.map((comment) => comment.id);
    const reactions = await this.prisma.feedReaction.findMany({
      where: {
        familyId,
        OR: [
          { postId: { in: postIds } },
          ...(commentIds.length ? [{ commentId: { in: commentIds } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        postId: true,
        commentId: true,
        type: true,
        reactorKeyHash: true,
        reactorName: true,
      },
    });

    const reactionsByPost = new Map<string, ReactionRecord[]>();
    const reactionsByComment = new Map<string, ReactionRecord[]>();
    for (const reaction of reactions) {
      const [map, id] = reaction.postId
        ? [reactionsByPost, reaction.postId]
        : [reactionsByComment, reaction.commentId];
      if (!id) continue;
      map.set(id, [...(map.get(id) ?? []), reaction]);
    }
    const commentsByPost = new Map<string, FeedCommentResponse[]>();
    for (const comment of comments) {
      commentsByPost.set(comment.postId, [
        ...(commentsByPost.get(comment.postId) ?? []),
        toCommentResponse(comment, reactionsByComment.get(comment.id) ?? [], keyHash),
      ]);
    }

    return posts.map((post) => ({
      id: post.id,
      authorName: post.authorName,
      content: post.content,
      images: post.images,
      createdAt: post.createdAt.toISOString(),
      editedAt: post.editedAt?.toISOString() ?? null,
      isMine: keyHash !== null && post.authorKeyHash === keyHash,
      reactions: summarize(reactionsByPost.get(post.id) ?? [], keyHash),
      comments: commentsByPost.get(post.id) ?? [],
    }));
  }

  private async findPost(familyId: string, postId: string): Promise<PostRecord> {
    const post = await this.prisma.feedPost.findFirst({
      where: { id: postId, familyId },
      select: POST_SELECT,
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết này.');
    return post;
  }

  private async findComment(familyId: string, commentId: string): Promise<CommentRecord> {
    const comment = await this.prisma.feedComment.findFirst({ where: { id: commentId, familyId } });
    if (!comment) throw new NotFoundException('Không tìm thấy bình luận này.');
    return comment;
  }

  private async assertTarget(familyId: string, target: ReactionTarget): Promise<void> {
    if ('postId' in target) await this.findPost(familyId, target.postId);
    else await this.findComment(familyId, target.commentId);
  }

  private reactionsFor(familyId: string, target: ReactionTarget): Promise<ReactionRecord[]> {
    return this.prisma.feedReaction.findMany({
      where: { familyId, ...target },
      orderBy: { createdAt: 'desc' },
      select: {
        postId: true,
        commentId: true,
        type: true,
        reactorKeyHash: true,
        reactorName: true,
      },
    });
  }
}
