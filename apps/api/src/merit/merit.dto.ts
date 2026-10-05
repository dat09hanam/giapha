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

/** Ten thousand billion đồng, as for Quỹ họ: safe as a JavaScript number. */
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

  /** `YYYY-MM-DD`, or null when the occasion has no fixed day. */
  @IsOptional()
  @IsString()
  @Matches(CALENDAR_DAY)
  heldOn?: string | null;
}

/**
 * One donation. CASH needs `amount`; ITEM needs `itemContent`; either may add a `note`. The
 * service checks the pairing and drops fields of the other kind.
 */
export class SaveMeritDonationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  donorName!: string;

  @IsEnum(MeritDonationKind)
  kind!: MeritDonationKind;

  /** Whole đồng. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_MERIT_AMOUNT)
  amount?: number | null;

  /** What was given, e.g. "1 chuông đồng, 2 mâm ngũ quả". */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  itemContent?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  /** `YYYY-MM-DD`; checked to be a real calendar day by the service. */
  @IsString()
  @Matches(CALENDAR_DAY)
  donatedOn!: string;
}
