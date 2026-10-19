import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ServiceRegistrationStatus } from '@prisma/client';

import { findActiveAmbassadorId, normalizeAmbassadorCode } from '../ambassadors/ambassador-code.js';
import { PrismaService } from '../database/prisma.service.js';
import type {
  CreateServiceRegistrationDto,
  UpdateServiceRegistrationDto,
} from './service-registration.dto.js';

const NOT_FOUND = 'Không tìm thấy đăng ký.';
const PLAN_UNAVAILABLE = 'Gói dịch vụ này hiện không còn nhận đăng ký.';

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
  createdAt: true,
  updatedAt: true,
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
  createdAt: string;
  updatedAt: string;
};

function toResponse(
  record: Prisma.ServiceRegistrationGetPayload<{ select: typeof registrationSelect }>,
): ServiceRegistrationResponse {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

@Injectable()
export class ServiceRegistrationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(input: CreateServiceRegistrationDto): Promise<void> {
    const plan = await this.prisma.pricingPlan.findFirst({
      where: { id: input.planId, isActive: true },
      select: { id: true, name: true },
    });
    if (!plan) throw new BadRequestException(PLAN_UNAVAILABLE);
    // A mistyped code is refused now, while the visitor can still correct it.
    await findActiveAmbassadorId(this.prisma, input.ambassadorCode);
    await this.prisma.serviceRegistration.create({
      data: {
        planId: plan.id,
        planName: plan.name,
        fullName: input.fullName.trim(),
        email: input.email?.trim().toLowerCase() || null,
        phone: input.phone.trim(),
        ambassadorCode: normalizeAmbassadorCode(input.ambassadorCode),
        consentAt: new Date(),
      },
    });
  }

  async listAll(): Promise<ServiceRegistrationResponse[]> {
    const records = await this.prisma.serviceRegistration.findMany({
      orderBy: { createdAt: 'desc' },
      select: registrationSelect,
    });
    return records.map(toResponse);
  }

  async update(
    id: string,
    input: UpdateServiceRegistrationDto,
  ): Promise<ServiceRegistrationResponse> {
    const existing = await this.prisma.serviceRegistration.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException(NOT_FOUND);
    const note = input.adminNote === undefined ? undefined : input.adminNote?.trim() || null;
    const record = await this.prisma.serviceRegistration.update({
      where: { id },
      data: { status: input.status, adminNote: note },
      select: registrationSelect,
    });
    return toResponse(record);
  }

  async remove(id: string): Promise<void> {
    const { count } = await this.prisma.serviceRegistration.deleteMany({ where: { id } });
    if (count === 0) throw new NotFoundException(NOT_FOUND);
  }
}
