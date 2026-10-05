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

/** Base64 of 4 MB of image data, plus a little slack for padding. */
const MAX_BASE64_LENGTH = 5_600_000;
const MAX_INSET_PERCENT = 80;
/** The name area may be a thin band, so its edges may reach further in. */
const MAX_NAME_INSET_PERCENT = 95;
/** Area edges are kept to a tenth of a percent so the ADMIN can nudge them finely. */
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

/** Percent of the art in from each edge; the service also caps opposite edges together. */
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

/** Where the family name is written; the service also caps opposite edges together. */
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

  /** Rise of the name's middle in percent of the area's height; negative bends it down. */
  @IsInt()
  @Min(-100)
  @Max(100)
  curve!: number;

  @Matches(/^#[0-9a-f]{6}$/i)
  color!: string;
}

/** Where one family-specific couplet line is written vertically. */
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

/** Fields an ADMIN may set on a decoration; drawing options are ignored on built-in ones. */
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

  /** The area the tree is placed in; null removes it. */
  @IsOptional()
  @ValidateNested()
  @Type(() => PosterInsetsDto)
  insets?: PosterInsetsDto | null;

  /** Where the family name is written; null removes it. */
  @IsOptional()
  @ValidateNested()
  @Type(() => PosterNameAreaDto)
  nameArea?: PosterNameAreaDto | null;

  /** Where the family's left vertical text is written; null removes it. */
  @IsOptional()
  @ValidateNested()
  @Type(() => PosterVerticalTextAreaDto)
  leftTextArea?: PosterVerticalTextAreaDto | null;

  /** Where the family's right vertical text is written; null removes it. */
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

  /** Replaces the uploaded image; not allowed on built-in decorations. */
  @IsOptional()
  @ValidateNested()
  @Type(() => PosterDecorationImageDto)
  image?: PosterDecorationImageDto;
}
