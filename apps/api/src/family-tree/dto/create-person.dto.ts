import { Gender } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePersonDto {
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  displayName!: string;

  @IsOptional()
  @IsUUID()
  fatherId?: string | null;

  @IsOptional()
  @IsUUID()
  motherId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  givenName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  familyName?: string | null;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsDateString()
  birthDate?: string | null;

  @IsOptional()
  @IsDateString()
  deathDate?: string | null;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  avatarUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  biography?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  generation?: number | null;
}
