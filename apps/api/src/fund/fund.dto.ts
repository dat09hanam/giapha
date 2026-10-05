import { FundEntryKind } from '@prisma/client';
import { IsEnum, IsInt, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

/** Ten thousand billion đồng: far above any clan fund, and safe as a JavaScript number. */
export const MAX_FUND_AMOUNT = 10_000_000_000_000;

export class SaveFundEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content!: string;

  @IsEnum(FundEntryKind)
  kind!: FundEntryKind;

  /** Whole đồng. */
  @IsInt()
  @Min(1)
  @Max(MAX_FUND_AMOUNT)
  amount!: number;

  /** The day the money moved, `YYYY-MM-DD`; checked to be a real calendar day by the service. */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  occurredOn!: string;
}
