import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import type { AuthRequest } from '../common/auth/auth.types.js';
import { FamilyAccessGuard } from '../common/auth/family-access.guard.js';
import { FamilyRoles } from '../common/auth/family-roles.decorator.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import { FamilySlugPipe } from '../common/pipes/family-slug.pipe.js';
// Runtime imports are required for Nest's emitted DTO validation metadata.
/* eslint-disable @typescript-eslint/consistent-type-imports */
import {
  CreateFeedCommentDto,
  CreateFeedPostDto,
  FeedQueryDto,
  SetFeedReactionDto,
  UpdateFeedContentDto,
} from './dto/feed.dto.js';
/* eslint-enable @typescript-eslint/consistent-type-imports */
import { readFeedKeyHash, requireFeedKeyHash } from './feed-author-key.js';
import { FeedService, type FeedActor } from './feed.service.js';
import type {
  FeedCommentResponse,
  FeedPageResponse,
  FeedPostResponse,
  FeedReactionSummary,
} from './feed.types.js';

/**
 * The family news feed. Every member may post, comment, reply and react;
 * a device edits or deletes its own posts and comments, and the clan head
 * (MEMBER_PLUS) may delete any of them.
 */
@Controller('families/:slug/feed')
@UseGuards(SessionAuthGuard, FamilyAccessGuard)
@FamilyRoles(UserRole.MEMBER_PLUS, UserRole.MEMBER)
export class FeedController {
  constructor(@Inject(FeedService) private readonly feed: FeedService) {}

  @Get()
  getPage(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Query() query: FeedQueryDto,
    @Req() request: AuthRequest,
  ): Promise<FeedPageResponse> {
    return this.feed.getPage(this.familyId(request), this.actor(request), query.cursor);
  }

  @Post('posts')
  createPost(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Body() input: CreateFeedPostDto,
    @Req() request: AuthRequest,
  ): Promise<FeedPostResponse> {
    return this.feed.createPost(this.familyId(request), requireFeedKeyHash(request), input);
  }

  @Patch('posts/:postId')
  updatePost(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('postId', new ParseUUIDPipe()) postId: string,
    @Body() input: UpdateFeedContentDto,
    @Req() request: AuthRequest,
  ): Promise<FeedPostResponse> {
    return this.feed.updatePost(
      this.familyId(request),
      requireFeedKeyHash(request),
      postId,
      input.content,
    );
  }

  @Delete('posts/:postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePost(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('postId', new ParseUUIDPipe()) postId: string,
    @Req() request: AuthRequest,
  ): Promise<void> {
    return this.feed.deletePost(this.familyId(request), this.actor(request), postId);
  }

  @Post('posts/:postId/comments')
  createComment(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('postId', new ParseUUIDPipe()) postId: string,
    @Body() input: CreateFeedCommentDto,
    @Req() request: AuthRequest,
  ): Promise<FeedCommentResponse> {
    return this.feed.createComment(
      this.familyId(request),
      requireFeedKeyHash(request),
      postId,
      input,
    );
  }

  @Patch('comments/:commentId')
  updateComment(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Body() input: UpdateFeedContentDto,
    @Req() request: AuthRequest,
  ): Promise<FeedCommentResponse> {
    return this.feed.updateComment(
      this.familyId(request),
      requireFeedKeyHash(request),
      commentId,
      input.content,
    );
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteComment(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Req() request: AuthRequest,
  ): Promise<void> {
    return this.feed.deleteComment(this.familyId(request), this.actor(request), commentId);
  }

  @Post('posts/:postId/reaction')
  reactToPost(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('postId', new ParseUUIDPipe()) postId: string,
    @Body() input: SetFeedReactionDto,
    @Req() request: AuthRequest,
  ): Promise<FeedReactionSummary> {
    return this.feed.setReaction(
      this.familyId(request),
      requireFeedKeyHash(request),
      { postId },
      input.type,
      input.reactorName,
    );
  }

  @Delete('posts/:postId/reaction')
  unreactToPost(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('postId', new ParseUUIDPipe()) postId: string,
    @Req() request: AuthRequest,
  ): Promise<FeedReactionSummary> {
    return this.feed.removeReaction(this.familyId(request), requireFeedKeyHash(request), {
      postId,
    });
  }

  @Post('comments/:commentId/reaction')
  reactToComment(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Body() input: SetFeedReactionDto,
    @Req() request: AuthRequest,
  ): Promise<FeedReactionSummary> {
    return this.feed.setReaction(
      this.familyId(request),
      requireFeedKeyHash(request),
      { commentId },
      input.type,
      input.reactorName,
    );
  }

  @Delete('comments/:commentId/reaction')
  unreactToComment(
    @Param('slug', FamilySlugPipe) _slug: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Req() request: AuthRequest,
  ): Promise<FeedReactionSummary> {
    return this.feed.removeReaction(this.familyId(request), requireFeedKeyHash(request), {
      commentId,
    });
  }

  private familyId(request: AuthRequest): string {
    if (!request.familyAccess) {
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    }
    return request.familyAccess.familyId;
  }

  private actor(request: AuthRequest): FeedActor {
    return {
      keyHash: readFeedKeyHash(request),
      canModerate: request.familyAccess?.role === UserRole.MEMBER_PLUS,
    };
  }
}
