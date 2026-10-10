import { IsBoolean, IsOptional } from 'class-validator';

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
