import { Type } from 'class-transformer';
import { Gender, MaritalStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
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
  ValidateNested,
} from 'class-validator';

import { MAP_URL_MESSAGE, MAP_URL_PATTERN } from '../../common/validation/map-url.js';
import { AVATAR_URL_MESSAGE, AVATAR_URL_PATTERN } from '../../common/validation/avatar-url.js';

export class FamilyTreeDesignPersonDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  clientId!: string;

  @IsOptional()
  @IsUUID()
  databaseId?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(191)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  honorific?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  nickname?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  courtesyName?: string | null;

  @IsEnum(Gender)
  gender!: Gender;

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
  @IsString()
  @MaxLength(100)
  worshipKeeperClientId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  deathAnniversaryText?: string | null;

  @IsInt()
  @Min(0)
  @Max(1000)
  generation!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  orderInFamily!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fatherClientId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  motherClientId?: string | null;
}

export class FamilyTreeDesignRelationshipDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  husbandClientId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  wifeClientId!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  wifeOrder!: number;
}

export class SaveFamilyTreeDesignDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => FamilyTreeDesignPersonDto)
  people!: FamilyTreeDesignPersonDto[];

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => FamilyTreeDesignRelationshipDto)
  relationships!: FamilyTreeDesignRelationshipDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  deletedPersonIds?: string[];
}
