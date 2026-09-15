import { IsEmail, Max, MaxLength, Min, IsInt, IsOptional } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  @MaxLength(191)
  email!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays = 7;
}
