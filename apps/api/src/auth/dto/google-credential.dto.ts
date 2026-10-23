import { IsString, MaxLength, MinLength } from 'class-validator';

export class GoogleCredentialDto {
  /** The ID token Google Identity Services hands the sign-in button's callback. */
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  credential!: string;
}
