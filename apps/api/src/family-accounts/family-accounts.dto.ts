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
