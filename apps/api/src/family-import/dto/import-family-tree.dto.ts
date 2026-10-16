import { Type } from 'class-transformer';
import { Gender, RelationshipStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const IMPORT_MAX_PEOPLE = 5000;

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

/** One row of the marriages sheet, linking two people rows by their codes. */
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

export class ImportFamilyTreeDto {
  /** True checks the rows and reports issues without writing anything. */
  @IsBoolean()
  dryRun!: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(IMPORT_MAX_PEOPLE)
  @ValidateNested({ each: true })
  @Type(() => ImportPersonDto)
  people!: ImportPersonDto[];

  @IsArray()
  @ArrayMaxSize(IMPORT_MAX_PEOPLE)
  @ValidateNested({ each: true })
  @Type(() => ImportRelationshipDto)
  relationships!: ImportRelationshipDto[];
}
