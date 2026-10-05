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

const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.@-]*$/;

export class CreateFamilyAccountDto {
  @IsString()
  @MinLength(3)
  @MaxLength(191)
  @Matches(USERNAME_PATTERN)
  username!: string;

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
