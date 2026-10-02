import { IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

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
}
