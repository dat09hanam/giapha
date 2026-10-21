import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FamilyStatus, ServiceRegistrationStatus, type Prisma } from '@prisma/client';

import { AdminNotifyService } from '../admin-notify/admin-notify.service.js';
import { bytesToNumber, isFamilyExpired, managerAccountWhere } from '../common/family-plan.js';
import { BYTES_PER_MEGABYTE } from '../common/family-storage.js';
import { planRightsSelect, resolvePlanRights, type PlanRights } from '../common/plan-rights.js';
import { PrismaService } from '../database/prisma.service.js';
import type { RequestPlanChangeDto } from './family-plan.dto.js';

const PLAN_UNAVAILABLE = 'Gói dịch vụ này hiện không còn nhận đăng ký.';
const SAME_PLAN = 'Dòng họ đang dùng gói này.';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Requests still waiting on the admin; a new request replaces one of these instead of piling up. */
const OPEN_STATUSES = [ServiceRegistrationStatus.NEW, ServiceRegistrationStatus.CONTACTED];

const requestSelect = {
  id: true,
  planId: true,
  planName: true,
  status: true,
  createdAt: true,
} satisfies Prisma.ServiceRegistrationSelect;

function toRequest(
  record: Prisma.ServiceRegistrationGetPayload<{ select: typeof requestSelect }>,
): PlanChangeRequest {
  return { ...record, createdAt: record.createdAt.toISOString() };
}

function megabytesUsed(bytes: bigint): number {
  return Math.ceil(bytesToNumber(bytes) / BYTES_PER_MEGABYTE);
}

type FamilyUsage = { members: number; managers: number; storageMb: number };

function formatMegabytes(megabytes: number): string {
  if (megabytes < 1024) return `${megabytes.toLocaleString('vi-VN')} MB`;
  return `${(Math.round((megabytes / 1024) * 10) / 10).toLocaleString('vi-VN')} GB`;
}

/** Each way the family's current data is over a plan's limits, worded for the clan head. */
function limitsExceeded(usage: FamilyUsage, rights: PlanRights): string[] {
  const over: string[] = [];
  if (rights.maxMembers !== null && usage.members > rights.maxMembers) {
    over.push(`${usage.members} thành viên trên cây (gói cho tối đa ${rights.maxMembers})`);
  }
  if (rights.maxManagers !== null && usage.managers > rights.maxManagers) {
    over.push(`${usage.managers} tài khoản quản trị chi (gói cho tối đa ${rights.maxManagers})`);
  }
  if (rights.maxStorageMb !== null && usage.storageMb > rights.maxStorageMb) {
    over.push(
      `${formatMegabytes(usage.storageMb)} lưu trữ (gói cho tối đa ${formatMegabytes(rights.maxStorageMb)})`,
    );
  }
  return over;
}

/** Used against allowed; a null limit means the plan sets no cap. */
export type PlanUsage = { used: number; limit: number | null };

export type PlanChangeRequest = {
  id: string;
  planId: string | null;
  planName: string;
  status: ServiceRegistrationStatus;
  createdAt: string;
};

/** What a clan head sees about their family's plan. */
export type FamilyPlanOverview = {
  plan: {
    id: string;
    name: string;
    price: number;
    billingPeriod: string | null;
    /** Null: the plan never expires. */
    durationMonths: number | null;
  };
  /** Null: the plan never expires. */
  planExpiresAt: string | null;
  /** Whole days until the plan ends, counted up; null when it never expires. */
  daysLeft: number | null;
  expired: boolean;
  members: PlanUsage;
  managers: PlanUsage;
  /** Megabytes, the used figure rounded up. */
  storageMb: PlanUsage;
  /** The latest request the admin has not finished; null when there is none. */
  pendingRequest: PlanChangeRequest | null;
};

@Injectable()
export class FamilyPlanService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AdminNotifyService) private readonly notifier: AdminNotifyService,
  ) {}

  async getOverview(familyId: string): Promise<FamilyPlanOverview> {
    const [family, members, managers, pending] = await Promise.all([
      this.prisma.family.findUnique({
        where: { id: familyId },
        select: {
          status: true,
          planExpiresAt: true,
          storageUsedBytes: true,
          plan: {
            select: { id: true, name: true, price: true, billingPeriod: true, ...planRightsSelect },
          },
        },
      }),
      this.prisma.person.count({ where: { familyId } }),
      this.prisma.user.count({ where: managerAccountWhere(familyId) }),
      this.findOpenRequest(familyId),
    ]);
    if (!family) throw new NotFoundException('Không tìm thấy dòng họ.');
    const rights = resolvePlanRights(family.plan.features);
    return {
      plan: {
        id: family.plan.id,
        name: family.plan.name,
        price: family.plan.price,
        billingPeriod: family.plan.billingPeriod,
        durationMonths: rights.durationMonths,
      },
      planExpiresAt: family.planExpiresAt?.toISOString() ?? null,
      daysLeft: family.planExpiresAt
        ? Math.max(0, Math.ceil((family.planExpiresAt.getTime() - Date.now()) / DAY_MS))
        : null,
      expired: isFamilyExpired(family),
      members: { used: members, limit: rights.maxMembers },
      managers: { used: managers, limit: rights.maxManagers },
      storageMb: {
        used: megabytesUsed(family.storageUsedBytes),
        limit: rights.maxStorageMb,
      },
      pendingRequest: pending,
    };
  }

  /**
   * Records the clan head's wish to move to another plan for the admin to follow up; the plan
   * itself changes only when the admin confirms payment. An open request is updated in place and
   * shows as unread again.
   */
  async requestChange(familyId: string, input: RequestPlanChangeDto): Promise<PlanChangeRequest> {
    const [family, plan, members, managers] = await Promise.all([
      this.prisma.family.findFirst({
        where: { id: familyId, status: { in: [FamilyStatus.ACTIVE, FamilyStatus.EXPIRED] } },
        select: {
          name: true,
          slug: true,
          planId: true,
          isDemo: true,
          storageUsedBytes: true,
          plan: { select: { name: true } },
        },
      }),
      this.prisma.pricingPlan.findFirst({
        where: { id: input.planId, isActive: true },
        select: { id: true, name: true, ...planRightsSelect },
      }),
      this.prisma.person.count({ where: { familyId } }),
      this.prisma.user.count({ where: managerAccountWhere(familyId) }),
    ]);
    if (!family) throw new NotFoundException('Không tìm thấy dòng họ.');
    if (family.isDemo) throw new BadRequestException('Gia phả mẫu không đổi gói dịch vụ.');
    if (!plan) throw new BadRequestException(PLAN_UNAVAILABLE);
    if (plan.id === family.planId) throw new BadRequestException(SAME_PLAN);
    // A plan the family's data no longer fits would lock it out of its own tree and files.
    const over = limitsExceeded(
      { members, managers, storageMb: megabytesUsed(family.storageUsedBytes) },
      resolvePlanRights(plan.features),
    );
    if (over.length > 0) {
      throw new BadRequestException(
        `Dòng họ đang có ${over.join(', ')}, vượt giới hạn của gói “${plan.name}”. Hãy chọn gói lớn hơn hoặc giảm bớt trước khi đổi.`,
      );
    }

    const data = {
      planId: plan.id,
      planName: plan.name,
      fromPlanName: family.plan.name,
      fullName: input.fullName.trim(),
      email: input.email?.trim().toLowerCase() || null,
      phone: input.phone.trim(),
      status: ServiceRegistrationStatus.NEW,
      seenAt: null,
      consentAt: new Date(),
    };
    const open = await this.findOpenRequest(familyId);
    const record = open
      ? await this.prisma.serviceRegistration.update({
          where: { id: open.id },
          data,
          select: requestSelect,
        })
      : await this.prisma.serviceRegistration.create({
          data: { ...data, familyId },
          select: requestSelect,
        });
    // A family opened without the clan head's phone or name gets them from this request, so the
    // admin's family list can show who to call; contact the admin already set is kept.
    await Promise.all([
      this.prisma.family.updateMany({
        where: { id: familyId, headPhone: null },
        data: { headPhone: data.phone },
      }),
      this.prisma.family.updateMany({
        where: { id: familyId, headName: null },
        data: { headName: data.fullName },
      }),
    ]);
    this.notifier.notify({
      kind: 'PLAN_CHANGE',
      familyName: family.name,
      slug: family.slug,
      fromPlanName: family.plan.name,
      planName: plan.name,
      fullName: data.fullName,
      phone: data.phone,
    });
    return toRequest(record);
  }

  private async findOpenRequest(familyId: string): Promise<PlanChangeRequest | null> {
    const record = await this.prisma.serviceRegistration.findFirst({
      where: { familyId, status: { in: OPEN_STATUSES } },
      orderBy: { createdAt: 'desc' },
      select: requestSelect,
    });
    return record ? toRequest(record) : null;
  }
}
