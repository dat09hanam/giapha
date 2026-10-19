import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import {
  AMBASSADOR_CODE_MESSAGE,
  AMBASSADOR_CODE_PATTERN,
} from '../../ambassadors/ambassador-code.js';
import { GoogleCredentialDto } from '../../auth/dto/google-credential.dto.js';

export class GoogleSignupDto extends GoogleCredentialDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @Matches(/^\d{2}\/\d{2}$/, { message: 'Ngày giỗ họ phải có định dạng DD/MM.' })
  deathAnniversary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ancestryOrigin?: string;

  @IsBoolean()
  agreed!: boolean;

  @IsOptional()
  @IsString()
  @Matches(AMBASSADOR_CODE_PATTERN, { message: AMBASSADOR_CODE_MESSAGE })
  ambassadorCode?: string;
}
