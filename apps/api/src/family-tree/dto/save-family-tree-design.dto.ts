import { Type } from "class-transformer";
import { Gender } from "@prisma/client";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
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
} from "class-validator";

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

  @IsEnum(Gender)
  gender!: Gender;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  birthYear?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  deathYear?: number | null;

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
  @IsUUID("4", { each: true })
  deletedPersonIds?: string[];
}
