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
