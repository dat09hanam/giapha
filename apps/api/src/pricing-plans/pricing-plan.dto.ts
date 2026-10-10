import { PricingFeatureStyle, PricingPlanTone } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsUUID,
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

import { PLAN_FEATURE_KEYS, type PlanFeatureKey } from '../common/plan-rights.js';

export const PRICING_PLAN_ICONS = ['sprout', 'bamboo', 'tree', 'pagoda', 'lotus', 'crown'] as const;

const MAX_FEATURES = PLAN_FEATURE_KEYS.length;
const CTA_HREF = /^(\/[^\s]*|#[\w-]+|https?:\/\/\S+|mailto:\S+|tel:[+\d\s.-]+)$/;

export class PricingPlanFeatureDto {
  @IsIn(PLAN_FEATURE_KEYS, { message: 'Tính năng phải chọn từ danh mục có sẵn.' })
  key!: PlanFeatureKey;

  @IsOptional()
  @IsInt()
  value!: number | null;

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
}

/** One column of the admin's feature table: a plan and its complete feature lines. */
export class PlanFeatureColumnDto {
  @IsUUID()
  id!: string;

  @IsArray()
  @ArrayMaxSize(MAX_FEATURES)
  @ValidateNested({ each: true })
  @Type(() => PricingPlanFeatureDto)
  features!: PricingPlanFeatureDto[];
}

/**
 * The whole feature table. Columns come in display order and must name every plan exactly once,
 * so the order is never partial.
 */
export class SavePlanFeatureTableDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PlanFeatureColumnDto)
  plans!: PlanFeatureColumnDto[];
}
