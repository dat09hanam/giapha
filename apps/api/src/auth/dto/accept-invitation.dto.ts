import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  invitationToken!: string;

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
}
