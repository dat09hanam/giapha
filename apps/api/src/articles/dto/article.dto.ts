import { ArticleCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBase64,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { IMAGE_CONTENT_TYPES } from '../../media/image-format.js';

const MAX_BASE64_LENGTH = 4_200_000;

export const ARTICLE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ArticleCoverDto {
  @IsIn(IMAGE_CONTENT_TYPES)
  contentType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(MAX_BASE64_LENGTH)
  @IsBase64()
  data!: string;
}

export class ListArticlesQueryDto {
  @IsEnum(ArticleCategory)
  category!: ArticleCategory;
}

class ArticleFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string | null;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class CreateArticleDto extends ArticleFieldsDto {
  @IsEnum(ArticleCategory)
  category!: ArticleCategory;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Matches(ARTICLE_SLUG_PATTERN, {
    message: 'Đường dẫn chỉ dùng chữ thường không dấu, số và dấu gạch ngang.',
  })
  slug!: string;

  @IsDefined()
  content!: unknown;

  @IsOptional()
  @ValidateNested()
  @Type(() => ArticleCoverDto)
  cover?: ArticleCoverDto;
}

export class UpdateArticleDto extends ArticleFieldsDto {
  @IsOptional()
  @IsEnum(ArticleCategory)
  category?: ArticleCategory;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Matches(ARTICLE_SLUG_PATTERN, {
    message: 'Đường dẫn chỉ dùng chữ thường không dấu, số và dấu gạch ngang.',
  })
  slug?: string;

  @IsOptional()
  content?: unknown;

  @IsOptional()
  @ValidateNested()
  @Type(() => ArticleCoverDto)
  cover?: ArticleCoverDto | null;
}
