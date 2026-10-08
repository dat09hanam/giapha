import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.@-]*$/;

/** Asks for a one-time code, mailed to the account's email. */
export class RequestPasswordResetDto {
  @IsString()
  @MinLength(3)
  @MaxLength(191)
  @Matches(USERNAME_PATTERN)
  username!: string;
}

/** The mailed code and the password that replaces the forgotten one. */
export class ConfirmPasswordResetDto {
  @IsString()
  @MinLength(3)
  @MaxLength(191)
  @Matches(USERNAME_PATTERN)
  username!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Mã xác nhận gồm 6 chữ số.' })
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  newPassword!: string;
}
