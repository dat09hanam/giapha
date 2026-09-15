import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterClanHeadDto {
  @IsEmail()
  @MaxLength(191)
  email!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(191)
  displayName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(191)
  clanName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  slug!: string;
}
