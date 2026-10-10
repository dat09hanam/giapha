import { FundEntryKind } from '@prisma/client';
import { IsEnum, IsInt, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export const MAX_FUND_AMOUNT = 10_000_000_000_000;

export class SaveFundEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content!: string;

  @IsEnum(FundEntryKind)
  kind!: FundEntryKind;

  @IsInt()
  @Min(1)
  @Max(MAX_FUND_AMOUNT)
  amount!: number;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  occurredOn!: string;
}
