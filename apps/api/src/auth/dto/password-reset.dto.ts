import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const LOGIN_PATTERN = /^\S+$/;

export class RequestPasswordResetDto {
  @IsString()
  @MinLength(3)
  @MaxLength(191)
  @Matches(LOGIN_PATTERN)
  login!: string;
}

export class VerifyPasswordResetDto {
  @IsString()
  @MinLength(3)
  @MaxLength(191)
  @Matches(LOGIN_PATTERN)
  login!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Mã xác nhận gồm 6 chữ số.' })
  code!: string;
}

export class ConfirmPasswordResetDto extends VerifyPasswordResetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  newPassword!: string;
}
