import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PricingFeatureStyle, type Prisma } from '@prisma/client';

import {
  assertValidPlanFeatures,
  PLAN_CATALOG,
  resolvePlanRights,
  type PlanCatalogEntry,
  type PlanFeatureLine,
} from '../common/plan-rights.js';
import { syncFamilyExpiryToPlan } from '../common/family-plan.js';
import { PrismaService } from '../database/prisma.service.js';
import type { PricingPlanDto, SavePlanFeatureTableDto } from './pricing-plan.dto.js';
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

function planData(
  input: PricingPlanDto,
): Omit<Prisma.PricingPlanCreateInput, 'features' | 'sortOrder'> {
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
  };
}

/** Validated against the catalog; a plan that would grant something unknown is never saved. */
function featureRows(
  features: SavePlanFeatureTableDto['plans'][number]['features'],
): Prisma.PricingPlanFeatureCreateWithoutPlanInput[] {
  const lines: PlanFeatureLine[] = features.map((feature) => ({
    key: feature.key,
    value: feature.value ?? null,
    style: feature.style,
  }));
  assertValidPlanFeatures(lines);
  return lines.map((line, index) => ({ ...line, sortOrder: index }));
}

/** A new plan starts with every catalog line: limits unlimited, options not included. */
function defaultFeatureRows(): Prisma.PricingPlanFeatureCreateWithoutPlanInput[] {
  return PLAN_CATALOG.map((entry, index) => ({
    key: entry.key,
    value: null,
    style: entry.kind === 'OPTION' ? PricingFeatureStyle.STRIKETHROUGH : PricingFeatureStyle.NORMAL,
    sortOrder: index,
  }));
}

const SORT_STEP = 10;

@Injectable()
export class PricingPlansService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  catalog(): readonly PlanCatalogEntry[] {
    return PLAN_CATALOG;
  }

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
    const last = await this.prisma.pricingPlan.aggregate({ _max: { sortOrder: true } });
    const record = await this.prisma.pricingPlan.create({
      data: {
        ...planData(input),
        sortOrder: (last._max.sortOrder ?? 0) + SORT_STEP,
        features: { create: defaultFeatureRows() },
      },
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
      data: planData(input),
      select: pricingPlanSelect,
    });
    return toPricingPlanResponse(record);
  }

  /** Saves the admin's feature table: every plan's lines and the display order, all or nothing. */
  async saveFeatureTable(input: SavePlanFeatureTableDto): Promise<PricingPlanResponse[]> {
    const ids = input.plans.map((column) => column.id);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Mỗi gói chỉ được có một cột trong bảng tính năng.');
    }
    const existing = await this.prisma.pricingPlan.findMany({ select: { id: true } });
    const known = new Set(existing.map((plan) => plan.id));
    if (existing.length !== ids.length || ids.some((id) => !known.has(id))) {
      throw new ConflictException(
        'Danh sách gói đã thay đổi ở nơi khác. Hãy tải lại trang rồi lưu bảng tính năng lần nữa.',
      );
    }
    const rows = input.plans.map((column) => featureRows(column.features));
    const now = new Date();
    await this.prisma.$transaction(async (transaction) => {
      for (const [index, column] of input.plans.entries()) {
        const lines = rows[index] ?? [];
        await transaction.pricingPlan.update({
          where: { id: column.id },
          data: {
            sortOrder: (index + 1) * SORT_STEP,
            features: { deleteMany: {}, create: lines },
          },
        });
        const { durationMonths } = resolvePlanRights(
          lines.map((line) => ({
            key: line.key,
            value: line.value ?? null,
            style: line.style ?? 'NORMAL',
          })),
        );
        await syncFamilyExpiryToPlan(transaction, column.id, durationMonths, now);
      }
    });
    return this.listAll();
  }

  async remove(id: string): Promise<void> {
    const families = await this.prisma.family.count({ where: { planId: id } });
    if (families > 0) {
      throw new ConflictException(
        `Gói đang được ${families} dòng họ sử dụng nên không thể xóa. Hãy ẩn gói thay vì xóa.`,
      );
    }
    const { count } = await this.prisma.pricingPlan.deleteMany({ where: { id } });
    if (count === 0) throw new NotFoundException(NOT_FOUND);
  }
}
