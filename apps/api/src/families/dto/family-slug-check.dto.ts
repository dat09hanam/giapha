import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

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
