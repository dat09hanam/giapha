import { MeritDonationKind } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const MAX_MERIT_AMOUNT = 10_000_000_000_000;

const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;

export class SaveMeritEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @Matches(CALENDAR_DAY)
  heldOn?: string | null;
}

export class SaveMeritDonationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  donorName!: string;

  @IsEnum(MeritDonationKind)
  kind!: MeritDonationKind;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_MERIT_AMOUNT)
  amount?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  itemContent?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @IsString()
  @Matches(CALENDAR_DAY)
  donatedOn!: string;
}
