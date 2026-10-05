import { IsBoolean, IsOptional } from 'class-validator';

/** Sections to switch on or off; a section left out keeps its setting. */
export class UpdatePlatformFeaturesDto {
  @IsOptional()
  @IsBoolean()
  feed?: boolean;

  @IsOptional()
  @IsBoolean()
  fund?: boolean;

  @IsOptional()
  @IsBoolean()
  merit?: boolean;

  @IsOptional()
  @IsBoolean()
  library?: boolean;

  @IsOptional()
  @IsBoolean()
  editSuggestions?: boolean;

  @IsOptional()
  @IsBoolean()
  printBook?: boolean;
}
