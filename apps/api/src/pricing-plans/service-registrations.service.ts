import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ServiceRegistrationStatus, type Prisma } from '@prisma/client';

import { AdminNotifyService } from '../admin-notify/admin-notify.service.js';
import { findActiveAmbassadorId, normalizeAmbassadorCode } from '../ambassadors/ambassador-code.js';
import { PrismaService } from '../database/prisma.service.js';
import { FamiliesService } from '../families/families.service.js';
import type {
  CreateServiceRegistrationDto,
  UpdateServiceRegistrationDto,
} from './service-registration.dto.js';

const NOT_FOUND = 'Không tìm thấy đăng ký.';
const PLAN_UNAVAILABLE = 'Gói dịch vụ này hiện không còn nhận đăng ký.';
const STALE = 'Đăng ký vừa được cập nhật ở nơi khác. Hãy tải lại trang.';

/**
 * A registration moves one step at a time: NEW → CONTACTED → COMPLETED (confirmed), and may be
 * cancelled until it is confirmed. COMPLETED and CANCELLED are final.
 */
const NEXT_STATUSES: Record<ServiceRegistrationStatus, readonly ServiceRegistrationStatus[]> = {
  NEW: [ServiceRegistrationStatus.CONTACTED, ServiceRegistrationStatus.CANCELLED],
  CONTACTED: [ServiceRegistrationStatus.COMPLETED, ServiceRegistrationStatus.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
};

const STATUS_LABELS: Record<ServiceRegistrationStatus, string> = {
  NEW: 'Mới',
  CONTACTED: 'Đã liên hệ',
  COMPLETED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
};

function assertStatusStep(from: ServiceRegistrationStatus, to: ServiceRegistrationStatus): void {
  if (NEXT_STATUSES[from].includes(to)) return;
  throw new BadRequestException(
    `Không thể chuyển đăng ký từ “${STATUS_LABELS[from]}” sang “${STATUS_LABELS[to]}”. Trạng thái đi lần lượt Mới → Đã liên hệ → Đã xác nhận.`,
  );
}

const registrationSelect = {
  id: true,
  planId: true,
  planName: true,
  fullName: true,
  email: true,
  phone: true,
  ambassadorCode: true,
  status: true,
  adminNote: true,
  seenAt: true,
  fromPlanName: true,
  createdAt: true,
  updatedAt: true,
  family: { select: { name: true, slug: true, deletedAt: true, plan: { select: { name: true } } } },
} satisfies Prisma.ServiceRegistrationSelect;

export type ServiceRegistrationResponse = {
  id: string;
  planId: string | null;
  planName: string;
  fullName: string;
  email: string | null;
  phone: string;
  ambassadorCode: string | null;
  status: ServiceRegistrationStatus;
  adminNote: string | null;
  /** Null until an admin opened the list after this registration arrived. */
  seenAt: string | null;
  /** The family asking to change plan; null for a new family's sign-up. */
  family: { name: string; slug: string; currentPlanName: string } | null;
  /** The family's plan when it sent the request; null for a sign-up or an older request. */
  fromPlanName: string | null;
  createdAt: string;
  updatedAt: string;
};

function toResponse(
  record: Prisma.ServiceRegistrationGetPayload<{ select: typeof registrationSelect }>,
): ServiceRegistrationResponse {
  const { family, ...registration } = record;
  return {
    ...registration,
    family:
      family && !family.deletedAt
        ? { name: family.name, slug: family.slug, currentPlanName: family.plan.name }
        : null,
    seenAt: record.seenAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

@Injectable()
export class ServiceRegistrationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FamiliesService) private readonly families: FamiliesService,
    @Inject(AdminNotifyService) private readonly notifier: AdminNotifyService,
  ) {}

  async create(input: CreateServiceRegistrationDto): Promise<void> {
    const plan = await this.prisma.pricingPlan.findFirst({
      where: { id: input.planId, isActive: true },
      select: { id: true, name: true },
    });
    if (!plan) throw new BadRequestException(PLAN_UNAVAILABLE);
    // A mistyped code is refused now, while the visitor can still correct it.
    await findActiveAmbassadorId(this.prisma, input.ambassadorCode);
    const created = await this.prisma.serviceRegistration.create({
      data: {
        planId: plan.id,
        planName: plan.name,
        fullName: input.fullName.trim(),
        email: input.email?.trim().toLowerCase() || null,
        phone: input.phone.trim(),
        ambassadorCode: normalizeAmbassadorCode(input.ambassadorCode),
        consentAt: new Date(),
      },
      select: { fullName: true, phone: true, email: true, planName: true, ambassadorCode: true },
    });
    this.notifier.notify({ kind: 'SERVICE_REGISTRATION', ...created });
  }

  async listAll(): Promise<ServiceRegistrationResponse[]> {
    const records = await this.prisma.serviceRegistration.findMany({
      orderBy: { createdAt: 'desc' },
      select: registrationSelect,
    });
    return records.map(toResponse);
  }

  /** Marks every unread registration as seen; the admin opened the list. */
  async markAllSeen(): Promise<void> {
    await this.prisma.serviceRegistration.updateMany({
      where: { seenAt: null },
      data: { seenAt: new Date() },
    });
  }

  /**
   * Changes the status one step and/or the admin's note. Confirming a family's plan request also
   * puts the family on the requested plan, in the same transaction.
   */
  async update(
    id: string,
    input: UpdateServiceRegistrationDto,
  ): Promise<ServiceRegistrationResponse> {
    const existing = await this.prisma.serviceRegistration.findUnique({
      where: { id },
      select: { status: true, familyId: true, planId: true },
    });
    if (!existing) throw new NotFoundException(NOT_FOUND);
    const status =
      input.status === undefined || input.status === existing.status ? undefined : input.status;
    if (status) assertStatusStep(existing.status, status);
    const note = input.adminNote === undefined ? undefined : input.adminNote?.trim() || null;

    await this.prisma.$transaction(async (transaction) => {
      // Conditional on the status read above, so two admins cannot both take the same step.
      const { count } = await transaction.serviceRegistration.updateMany({
        where: { id, status: existing.status },
        data: { status, adminNote: note },
      });
      if (count === 0) throw new ConflictException(STALE);
      if (status !== ServiceRegistrationStatus.COMPLETED || !existing.familyId) return;
      if (!existing.planId) {
        throw new BadRequestException(
          'Gói được yêu cầu đã bị xóa nên không thể xác nhận. Hãy hủy đăng ký này.',
        );
      }
      await this.families.applyPlan(existing.familyId, existing.planId, transaction);
    });

    const record = await this.prisma.serviceRegistration.findUniqueOrThrow({
      where: { id },
      select: registrationSelect,
    });
    return toResponse(record);
  }

  async remove(id: string): Promise<void> {
    const { count } = await this.prisma.serviceRegistration.deleteMany({ where: { id } });
    if (count === 0) throw new NotFoundException(NOT_FOUND);
  }
}
