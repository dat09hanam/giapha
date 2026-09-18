import { Gender } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { AVATAR_URL_MESSAGE, AVATAR_URL_PATTERN } from '../../common/validation/avatar-url.js';

export class UpdatePersonDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  honorific?: string | null;

  @IsOptional()
  @IsUUID()
  fatherId?: string | null;

  @IsOptional()
  @IsUUID()
  motherId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  nickname?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  courtesyName?: string | null;

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
  @IsInt()
  @Min(1)
  @Max(30)
  lunarDeathDay?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  lunarDeathMonth?: number | null;

  @IsOptional()
  @IsBoolean()
  isAlive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  burialPlace?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @Matches(AVATAR_URL_PATTERN, { message: AVATAR_URL_MESSAGE })
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

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  orderInFamily?: number | null;
}
