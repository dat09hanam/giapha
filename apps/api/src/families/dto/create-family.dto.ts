import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateFamilyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  /**
   * Only the sample family's path is chosen by the client; every other Family's slug is derived
   * from its name and death anniversary, so this is ignored for them.
   */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  slug?: string;

  /** Quê quán / nguồn gốc; its first part disambiguates the slug when name and anniversary clash. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ancestryOrigin?: string;

  @IsString()
  @Matches(/^\d{2}\/\d{2}$/)
  deathAnniversary!: string;

  /**
   * The clan head's email, where a forgotten password's one-time code is sent. Required for every
   * family with accounts; the sample family has none. Refused when another account already has it.
   */
  @ValidateIf((input: CreateFamilyDto) => input.isDemo !== true || input.headEmail !== undefined)
  @IsEmail({}, { message: 'Email Trưởng họ không hợp lệ.' })
  @MaxLength(191)
  headEmail?: string;

  /** Creates the public sample family (Gia phả mẫu), refused while one already exists. */
  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;
}
