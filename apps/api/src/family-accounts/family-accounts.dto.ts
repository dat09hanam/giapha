import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
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
}

export class SetBranchesDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  rootPersonIds!: string[];
}
