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

import {
  AMBASSADOR_CODE_MESSAGE,
  AMBASSADOR_CODE_PATTERN,
} from '../../ambassadors/ambassador-code.js';

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

  @ValidateIf((input: CreateFamilyDto) => input.headEmail !== undefined && input.headEmail !== '')
  @IsEmail({}, { message: 'Email Trưởng họ không hợp lệ.' })
  @MaxLength(191)
  headEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  headName?: string;

  @ValidateIf((input: CreateFamilyDto) => input.isDemo !== true || input.headPhone !== undefined)
  @IsString()
  @Matches(/^0\d{9}$/, { message: 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.' })
  headPhone?: string;

  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;

  @IsUUID('all', { message: 'Hãy chọn gói dịch vụ mà dòng họ đã mua.' })
  planId!: string;

  @IsOptional()
  @IsString()
  @Matches(AMBASSADOR_CODE_PATTERN, { message: AMBASSADOR_CODE_MESSAGE })
  ambassadorCode?: string;
}
