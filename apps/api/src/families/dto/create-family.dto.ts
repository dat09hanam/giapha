import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateFamilyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ancestryOrigin?: string;

  @IsString()
  @Matches(/^\d{2}\/\d{2}$/)
  deathAnniversary!: string;

  @ValidateIf((input: CreateFamilyDto) => input.isDemo !== true || input.headEmail !== undefined)
  @IsEmail({}, { message: 'Email Trưởng họ không hợp lệ.' })
  @MaxLength(191)
  headEmail?: string;

  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;

  @IsUUID('all', { message: 'Hãy chọn gói dịch vụ mà dòng họ đã mua.' })
  planId!: string;
}
