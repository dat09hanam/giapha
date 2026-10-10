import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service.js';
import type { PricingPlanDto } from './pricing-plan.dto.js';
import {
  pricingPlanSelect,
  toPricingPlanResponse,
  type PricingPlanResponse,
} from './pricing-plan.types.js';

const NOT_FOUND = 'Không tìm thấy gói dịch vụ.';

function optional(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function planData(input: PricingPlanDto): Omit<Prisma.PricingPlanCreateInput, 'features'> {
  return {
    name: input.name.trim(),
    description: optional(input.description),
    price: input.price,
    billingPeriod: optional(input.billingPeriod),
    icon: input.icon,
    tone: input.tone,
    badge: optional(input.badge),
    isFeatured: input.isFeatured,
    ctaLabel: input.ctaLabel.trim(),
    ctaHref: input.ctaHref.trim(),
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  };
}

function featureRows(input: PricingPlanDto): Prisma.PricingPlanFeatureCreateWithoutPlanInput[] {
  return input.features
    .map((feature) => ({ text: feature.text.trim(), style: feature.style }))
    .filter((feature) => feature.text.length > 0)
    .map((feature, index) => ({ ...feature, sortOrder: index }));
}

@Injectable()
export class PricingPlansService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listActive(): Promise<PricingPlanResponse[]> {
    const records = await this.prisma.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: pricingPlanSelect,
    });
    return records.map(toPricingPlanResponse);
  }

  async listAll(): Promise<PricingPlanResponse[]> {
    const records = await this.prisma.pricingPlan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: pricingPlanSelect,
    });
    return records.map(toPricingPlanResponse);
  }

  async create(input: PricingPlanDto): Promise<PricingPlanResponse> {
    const record = await this.prisma.pricingPlan.create({
      data: { ...planData(input), features: { create: featureRows(input) } },
      select: pricingPlanSelect,
    });
    return toPricingPlanResponse(record);
  }

  async update(id: string, input: PricingPlanDto): Promise<PricingPlanResponse> {
    const existing = await this.prisma.pricingPlan.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException(NOT_FOUND);
    const record = await this.prisma.pricingPlan.update({
      where: { id },
      data: {
        ...planData(input),
        features: { deleteMany: {}, create: featureRows(input) },
      },
      select: pricingPlanSelect,
    });
    return toPricingPlanResponse(record);
  }

  async remove(id: string): Promise<void> {
    const { count } = await this.prisma.pricingPlan.deleteMany({ where: { id } });
    if (count === 0) throw new NotFoundException(NOT_FOUND);
  }
}
