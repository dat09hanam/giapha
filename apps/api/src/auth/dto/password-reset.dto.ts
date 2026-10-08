import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** A username or an account's email; no spaces, since neither contains one. */
const LOGIN_PATTERN = /^\S+$/;

/** Asks for a one-time code, mailed to the account's email. */
export class RequestPasswordResetDto {
  /** The account's username or its email. */
  @IsString()
  @MinLength(3)
  @MaxLength(191)
  @Matches(LOGIN_PATTERN)
  login!: string;
}

/** The mailed code, checked before the form asks for a new password. */
export class VerifyPasswordResetDto {
  /** The same username or email the code was requested with. */
  @IsString()
  @MinLength(3)
  @MaxLength(191)
  @Matches(LOGIN_PATTERN)
  login!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Mã xác nhận gồm 6 chữ số.' })
  code!: string;
}

/** The mailed code and the password that replaces the forgotten one. */
export class ConfirmPasswordResetDto extends VerifyPasswordResetDto {

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  newPassword!: string;
}
