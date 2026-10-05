import { FeedReactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBase64,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const MAX_POST_IMAGES = 4;
/** Phones shrink photos before sending; 4 of these stay under the API's 6 MB body limit. */
export const MAX_FEED_IMAGE_BYTES = 1024 * 1024;
const MAX_FEED_IMAGE_BASE64 = Math.ceil((MAX_FEED_IMAGE_BYTES * 4) / 3) + 16;

export class FeedImageInputDto {
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(MAX_FEED_IMAGE_BASE64)
  @IsBase64()
  data!: string;

  @IsInt()
  @Min(1)
  @Max(10000)
  width!: number;

  @IsInt()
  @Min(1)
  @Max(10000)
  height!: number;
}

export class CreateFeedPostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  authorName!: string;

  /** May be empty when the post is only photos. */
  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_POST_IMAGES)
  @ValidateNested({ each: true })
  @Type(() => FeedImageInputDto)
  images?: FeedImageInputDto[];
}

export class UpdateFeedContentDto {
  @IsString()
  @MaxLength(5000)
  content!: string;
}

export class CreateFeedCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  authorName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;

  /** The comment being answered; a reply to a reply joins its top-level thread. */
  @IsOptional()
  @IsUUID()
  replyToId?: string;
}

export class SetFeedReactionDto {
  @IsEnum(FeedReactionType)
  type!: FeedReactionType;

  /** Shown in "who reacted"; devices that never typed a name send a placeholder. */
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  reactorName!: string;
}

export class FeedQueryDto {
  /** The last post id of the previous page. */
  @IsOptional()
  @IsUUID()
  cursor?: string;
}
