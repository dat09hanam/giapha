import { PosterBackgroundMode, PosterDecorationKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
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
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const POSTER_TEXT_MODES = ['solid', 'gradient'] as const;

export class PosterTextGradientDto {
  /** Start, optional middle and end colour, spread evenly along the direction. */
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(3)
  @Matches(HEX_COLOR, { each: true })
  colors!: string[];

  /** CSS-style angle: 0 runs bottom to top, 90 left to right, 180 top to bottom. */
  @IsInt()
  @Min(0)
  @Max(359)
  angle!: number;
}

/** Width in percent of the font size, so the outline scales with the poster. */
export class PosterTextStrokeDto {
  @IsBoolean()
  enabled!: boolean;

  @Matches(HEX_COLOR)
  color!: string;

  @IsNumber(INSET_PRECISION)
  @Min(0)
  @Max(20)
  width!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  opacity!: number;
}

/** Blur and offsets in percent of the font size, so the shadow scales with the poster. */
export class PosterTextShadowDto {
  @IsBoolean()
  enabled!: boolean;

  @Matches(HEX_COLOR)
  color!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  opacity!: number;

  @IsNumber(INSET_PRECISION)
  @Min(0)
  @Max(30)
  blur!: number;

  @IsNumber(INSET_PRECISION)
  @Min(-20)
  @Max(20)
  offsetX!: number;

  @IsNumber(INSET_PRECISION)
  @Min(-20)
  @Max(20)
  offsetY!: number;
}

/** Effects on top of the area's `color`, which stays the solid fill. Null = the built-in look. */
export class PosterTextStyleDto {
  @IsIn(POSTER_TEXT_MODES)
  mode!: (typeof POSTER_TEXT_MODES)[number];

  @ValidateNested()
  @Type(() => PosterTextGradientDto)
  gradient!: PosterTextGradientDto;

  @ValidateNested()
  @Type(() => PosterTextStrokeDto)
  stroke!: PosterTextStrokeDto;

  @ValidateNested()
  @Type(() => PosterTextShadowDto)
  shadow!: PosterTextShadowDto;
}

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

  @Matches(HEX_COLOR)
  color!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PosterTextStyleDto)
  style?: PosterTextStyleDto | null;
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

  @Matches(HEX_COLOR)
  color!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PosterTextStyleDto)
  style?: PosterTextStyleDto | null;
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
