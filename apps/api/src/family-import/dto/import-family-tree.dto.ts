import { Type } from 'class-transformer';
import { Gender, RelationshipStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const IMPORT_MAX_PEOPLE = 5000;

/** Rows of a downloaded member list; larger than any plan's member limit. */
export const EXISTING_MAX_PEOPLE = 50_000;

/** One row of the people sheet. `code` is the spreadsheet's own key; it never reaches the database. */
export class ImportPersonDto {
  @IsInt()
  @Min(1)
  row!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(191)
  name!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  fatherCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  motherCode?: string | null;

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

  @IsOptional()
  @IsString()
  @MaxLength(100)
  birthDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deathDate?: string | null;

  @IsOptional()
  @IsBoolean()
  isAlive?: boolean | null;

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
  @IsInt()
  @Min(0)
  @Max(150)
  ageAtDeath?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  burialPlace?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  worshipPlace?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

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
  @IsString()
  @MaxLength(10000)
  biography?: string | null;
}

/** A couple, linking two rows by their codes; the husband row names the wife. */
export class ImportRelationshipDto {
  @IsInt()
  @Min(1)
  row!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  husbandCode!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  wifeCode!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  wifeOrder?: number | null;

  @IsOptional()
  @IsEnum(RelationshipStatus)
  status?: RelationshipStatus | null;
}

/**
 * A row of a downloaded member list that stands for someone already in the tree, so new rows can
 * name them as a parent or spouse. Only the link from `code` to `personId` is read; the row's other
 * cells are never written back.
 */
export class ImportExistingPersonDto {
  @IsInt()
  @Min(1)
  row!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @IsUUID()
  personId!: string;
}

export class ImportFamilyTreeDto {
  /** True checks the rows and reports issues without writing anything. */
  @IsBoolean()
  dryRun!: boolean;

  /** New people only; may be empty when the file just adds wives to people already in the tree. */
  @IsArray()
  @ArrayMaxSize(IMPORT_MAX_PEOPLE)
  @ValidateNested({ each: true })
  @Type(() => ImportPersonDto)
  people!: ImportPersonDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(EXISTING_MAX_PEOPLE)
  @ValidateNested({ each: true })
  @Type(() => ImportExistingPersonDto)
  existingPeople?: ImportExistingPersonDto[];

  @IsArray()
  @ArrayMaxSize(IMPORT_MAX_PEOPLE)
  @ValidateNested({ each: true })
  @Type(() => ImportRelationshipDto)
  relationships!: ImportRelationshipDto[];
}
