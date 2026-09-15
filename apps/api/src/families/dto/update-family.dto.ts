import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateFamilyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}
