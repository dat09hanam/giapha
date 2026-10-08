import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  /** The account's username or its email; neither contains a space. */
  @IsString()
  @MinLength(3)
  @MaxLength(191)
  @Matches(/^\S+$/)
  username!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
