import {
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateFamilyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  /**
   * The formatted introduction (see common/validation/rich-text.ts), checked by the service;
   * null clears it. It replaces `description`, which the service then derives from it.
   */
  @IsOptional()
  @IsObject()
  introduction?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ancestryOrigin?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}\/\d{2}$/)
  deathAnniversary?: string | null;

  /** Library background ID; null shows plain paper. */
  @IsOptional()
  @IsUUID()
  posterBackgroundId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  posterLeftText?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  posterRightText?: string | null;
}
