import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** The create form's inputs that decide a Family's slug, checked while the admin types. */
export class FamilySlugCheckQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @Matches(/^\d{2}\/\d{2}$/)
  deathAnniversary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ancestryOrigin?: string;
}
