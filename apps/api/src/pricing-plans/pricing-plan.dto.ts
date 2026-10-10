import { PricingFeatureStyle, PricingPlanTone } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const PRICING_PLAN_ICONS = ['sprout', 'bamboo', 'tree', 'pagoda', 'lotus', 'crown'] as const;

const MAX_FEATURES = 30;
const CTA_HREF = /^(\/[^\s]*|#[\w-]+|https?:\/\/\S+|mailto:\S+|tel:[+\d\s.-]+)$/;

export class PricingPlanFeatureDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  text!: string;

  @IsEnum(PricingFeatureStyle)
  style!: PricingFeatureStyle;
}

export class PricingPlanDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string | null;

  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  price!: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  billingPeriod?: string | null;

  @IsIn(PRICING_PLAN_ICONS)
  icon!: string;

  @IsEnum(PricingPlanTone)
  tone!: PricingPlanTone;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  badge?: string | null;

  @IsBoolean()
  isFeatured!: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  ctaLabel!: string;

  @IsString()
  @MaxLength(255)
  @Matches(CTA_HREF, {
    message: 'Liên kết của nút phải là đường dẫn trong trang (/…, #…) hoặc địa chỉ http(s).',
  })
  ctaHref!: string;

  @IsBoolean()
  isActive!: boolean;

  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder!: number;

  @IsArray()
  @ArrayMaxSize(MAX_FEATURES)
  @ValidateNested({ each: true })
  @Type(() => PricingPlanFeatureDto)
  features!: PricingPlanFeatureDto[];
}
