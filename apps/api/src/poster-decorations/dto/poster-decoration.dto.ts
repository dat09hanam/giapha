import { PosterBackgroundMode, PosterDecorationKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBase64,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { IMAGE_CONTENT_TYPES } from '../../media/image-format.js';

const MAX_BASE64_LENGTH = 5_600_000;
const MAX_INSET_PERCENT = 80;
const MAX_NAME_INSET_PERCENT = 95;
const INSET_PRECISION = { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 1 };

export class PosterDecorationImageDto {
  @IsIn(IMAGE_CONTENT_TYPES)
  contentType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(MAX_BASE64_LENGTH)
  @IsBase64()
  data!: string;
}

export class PosterInsetsDto {
  @IsNumber(INSET_PRECISION)
  @Min(0)
  @Max(MAX_INSET_PERCENT)
  top!: number;

  @IsNumber(INSET_PRECISION)
  @Min(0)
  @Max(MAX_INSET_PERCENT)
  right!: number;

  @IsNumber(INSET_PRECISION)
  @Min(0)
  @Max(MAX_INSET_PERCENT)
  bottom!: number;

  @IsNumber(INSET_PRECISION)
  @Min(0)
  @Max(MAX_INSET_PERCENT)
  left!: number;
}

export class PosterNameAreaDto {
  @IsNumber(INSET_PRECISION)
  @Min(0)
  @Max(MAX_NAME_INSET_PERCENT)
  top!: number;

  @IsNumber(INSET_PRECISION)
  @Min(0)
  @Max(MAX_NAME_INSET_PERCENT)
  right!: number;

  @IsNumber(INSET_PRECISION)
  @Min(0)
  @Max(MAX_NAME_INSET_PERCENT)
  bottom!: number;

  @IsNumber(INSET_PRECISION)
  @Min(0)
  @Max(MAX_NAME_INSET_PERCENT)
  left!: number;

  @IsInt()
  @Min(-100)
  @Max(100)
  curve!: number;

  @Matches(/^#[0-9a-f]{6}$/i)
  color!: string;
}

export class PosterVerticalTextAreaDto {
  @IsNumber(INSET_PRECISION)
  @Min(0)
  @Max(MAX_NAME_INSET_PERCENT)
  top!: number;

  @IsNumber(INSET_PRECISION)
  @Min(0)
  @Max(MAX_NAME_INSET_PERCENT)
  right!: number;

  @IsNumber(INSET_PRECISION)
  @Min(0)
  @Max(MAX_NAME_INSET_PERCENT)
  bottom!: number;

  @IsNumber(INSET_PRECISION)
  @Min(0)
  @Max(MAX_NAME_INSET_PERCENT)
  left!: number;

  @Matches(/^#[0-9a-f]{6}$/i)
  color!: string;
}

class PosterDecorationFieldsDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @IsOptional()
  @IsEnum(PosterBackgroundMode)
  backgroundMode?: PosterBackgroundMode;

  @IsOptional()
  @ValidateNested()
  @Type(() => PosterInsetsDto)
  insets?: PosterInsetsDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => PosterNameAreaDto)
  nameArea?: PosterNameAreaDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => PosterVerticalTextAreaDto)
  leftTextArea?: PosterVerticalTextAreaDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => PosterVerticalTextAreaDto)
  rightTextArea?: PosterVerticalTextAreaDto | null;
}

export class CreatePosterDecorationDto extends PosterDecorationFieldsDto {
  @IsEnum(PosterDecorationKind)
  kind!: PosterDecorationKind;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ValidateNested()
  @Type(() => PosterDecorationImageDto)
  image!: PosterDecorationImageDto;
}

export class UpdatePosterDecorationDto extends PosterDecorationFieldsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PosterDecorationImageDto)
  image?: PosterDecorationImageDto;
}
