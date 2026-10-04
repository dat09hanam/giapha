import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateFamilyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  slug!: string;

  @IsString()
  @Matches(/^\d{2}\/\d{2}$/)
  deathAnniversary!: string;
}
