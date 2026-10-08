import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserStatus } from '@prisma/client';

const USERNAME_PREFIX_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.@-]*$/;

/**
 * What the clan head types, e.g. `adminchi1`; the API appends the family's suffix
 * (`HoPham1503`) to make the username.
 */
export class UsernameCheckQueryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  @Matches(USERNAME_PREFIX_PATTERN)
  usernamePrefix!: string;
}

export class CreateFamilyAccountDto {
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  @Matches(USERNAME_PREFIX_PATTERN)
  usernamePrefix!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(191)
  displayName!: string;

  /** Optional; lets the member sign in with it and receive a Quên mật khẩu code. */
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @MaxLength(191)
  email?: string;
}

export class UpdateFamilyAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  displayName?: string;

  @IsOptional()
  @IsIn([UserStatus.ACTIVE, UserStatus.SUSPENDED])
  status?: UserStatus;

  /** A new email, or an empty string to remove it. Left out, the email stays as it is. */
  @IsOptional()
  @IsString()
  @ValidateIf((input: UpdateFamilyAccountDto) => input.email !== '')
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @MaxLength(191)
  email?: string;
}

export class SetBranchesDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  rootPersonIds!: string[];
}
