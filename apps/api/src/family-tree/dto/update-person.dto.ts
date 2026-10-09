import { Gender, MaritalStatus } from '@prisma/client';
import {
  IsBoolean,
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

import { MAP_URL_MESSAGE, MAP_URL_PATTERN } from '../../common/validation/map-url.js';
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
  @IsString()
  @MaxLength(100)
  birthDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
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
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  education?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  occupation?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  hometown?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  currentAddress?: string | null;

  @IsOptional()
  @Matches(MAP_URL_PATTERN, { message: MAP_URL_MESSAGE })
  @MaxLength(500)
  mapUrl?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(150)
  ageAtDeath?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  worshipPlace?: string | null;

  @IsOptional()
  @IsUUID()
  worshipKeeperId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  deathAnniversaryText?: string | null;

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
