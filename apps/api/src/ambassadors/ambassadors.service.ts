import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmbassadorStatus, Prisma, type AmbassadorCommissionKind } from '@prisma/client';

import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { commissionAmountFor, generateAmbassadorCode } from './ambassador-code.js';
import { ambassadorWelcomeMail } from './ambassador-mail.js';
import type {
  CreateAmbassadorDto,
  PayCommissionsDto,
  UpdateAmbassadorDto,
} from './ambassador.dto.js';

const NOT_FOUND = 'Không tìm thấy đại sứ.';
const MAIL_NOT_CONFIGURED =
  'Hệ thống chưa được cấu hình gửi email nên chưa thể nhận đăng ký đại sứ. Vui lòng liên hệ Admin.';
const MAIL_FAILED = 'Không gửi được email lúc này. Vui lòng thử lại sau.';
const CODE_ATTEMPTS = 5;

export type AmbassadorSignupResult = {
  /** The email already belonged to an ambassador; their existing code was sent again. */
  alreadyRegistered: boolean;
};

export type AmbassadorResponse = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string;
  status: AmbassadorStatus;
  adminNote: string | null;
  createdAt: string;
  familyCount: number;
  pendingAmount: number;
  pendingCount: number;
  paidAmount: number;
  paidCount: number;
};

export type AmbassadorCommissionResponse = {
  id: string;
  ambassadorId: string;
  ambassadorName: string;
  ambassadorCode: string;
  familyName: string;
  familySlug: string | null;
  planName: string;
  kind: AmbassadorCommissionKind;
  percent: number;
  amount: number;
  createdAt: string;
  paidAt: string | null;
  paidByName: string | null;
  paidNote: string | null;
};

const ambassadorSelect = {
  id: true,
  code: true,
  fullName: true,
  phone: true,
  email: true,
  status: true,
  adminNote: true,
  createdAt: true,
  _count: { select: { families: true } },
} satisfies Prisma.AmbassadorSelect;

type AmbassadorRecord = Prisma.AmbassadorGetPayload<{ select: typeof ambassadorSelect }>;

type CommissionTotals = {
  pendingAmount: number;
  pendingCount: number;
  paidAmount: number;
  paidCount: number;
};

const NO_COMMISSIONS: CommissionTotals = {
  pendingAmount: 0,
  pendingCount: 0,
  paidAmount: 0,
  paidCount: 0,
};

const commissionSelect = {
  id: true,
  ambassadorId: true,
  familyName: true,
  planName: true,
  kind: true,
  percent: true,
  amount: true,
  createdAt: true,
  paidAt: true,
  paidNote: true,
  ambassador: { select: { fullName: true, code: true } },
  family: { select: { slug: true, deletedAt: true } },
  paidBy: { select: { displayName: true } },
} satisfies Prisma.AmbassadorCommissionSelect;

type CommissionSum = {
  paidAt: Date | null;
  _sum: { amount: number | null };
  _count: { _all: number };
};

function addToTotals(totals: CommissionTotals, sum: CommissionSum): void {
  const amount = sum._sum.amount ?? 0;
  if (sum.paidAt) {
    totals.paidAmount += amount;
    totals.paidCount += sum._count._all;
  } else {
    totals.pendingAmount += amount;
    totals.pendingCount += sum._count._all;
  }
}

function toAmbassador(record: AmbassadorRecord, totals: CommissionTotals): AmbassadorResponse {
  const { _count, createdAt, ...ambassador } = record;
  return {
    ...ambassador,
    createdAt: createdAt.toISOString(),
    familyCount: _count.families,
    ...totals,
  };
}

function toCommission(
  record: Prisma.AmbassadorCommissionGetPayload<{ select: typeof commissionSelect }>,
): AmbassadorCommissionResponse {
  return {
    id: record.id,
    ambassadorId: record.ambassadorId,
    ambassadorName: record.ambassador.fullName,
    ambassadorCode: record.ambassador.code,
    familyName: record.familyName,
    familySlug: record.family.deletedAt ? null : record.family.slug,
    planName: record.planName,
    kind: record.kind,
    percent: record.percent,
    amount: record.amount,
    createdAt: record.createdAt.toISOString(),
    paidAt: record.paidAt?.toISOString() ?? null,
    paidByName: record.paidBy?.displayName ?? null,
    paidNote: record.paidNote,
  };
}

function isUniqueViolation(error: unknown, field: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    String(error.meta?.target ?? '').includes(field)
  );
}

@Injectable()
export class AmbassadorsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MailService) private readonly mail: MailService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  /**
   * Signs a visitor up as an ambassador and emails their code. Signing up again with the same
   * email sends the existing code once more, so a lost email is recovered the same way.
   */
  async register(input: CreateAmbassadorDto): Promise<AmbassadorSignupResult> {
    if (!this.mail.isConfigured) throw new ServiceUnavailableException(MAIL_NOT_CONFIGURED);
    const email = input.email.trim().toLowerCase();

    const existing = await this.prisma.ambassador.findUnique({
      where: { email },
      select: { id: true, code: true, fullName: true, status: true },
    });
    if (existing) {
      if (existing.status !== AmbassadorStatus.ACTIVE) {
        throw new ConflictException(
          'Email này đã đăng ký đại sứ nhưng đang tạm ngừng. Vui lòng liên hệ Admin để được hỗ trợ.',
        );
      }
      await this.sendWelcome(email, existing.fullName, existing.code);
      return { alreadyRegistered: true };
    }

    const created = await this.createWithFreshCode({
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      email,
    });
    if (!created) {
      // Someone signed up with this email a moment ago; treat it like a repeat sign-up.
      return this.register(input);
    }
    try {
      await this.sendWelcome(email, created.fullName, created.code);
    } catch (error: unknown) {
      // Without the email the person never learns their code; let them try again cleanly.
      await this.prisma.ambassador.delete({ where: { id: created.id } });
      throw error;
    }
    return { alreadyRegistered: false };
  }

  async listAll(): Promise<AmbassadorResponse[]> {
    const [records, sums] = await Promise.all([
      this.prisma.ambassador.findMany({
        orderBy: { createdAt: 'desc' },
        select: ambassadorSelect,
      }),
      this.prisma.ambassadorCommission.groupBy({
        by: ['ambassadorId', 'paidAt'],
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);
    const totals = new Map<string, CommissionTotals>();
    for (const sum of sums) {
      const current = totals.get(sum.ambassadorId) ?? { ...NO_COMMISSIONS };
      addToTotals(current, sum);
      totals.set(sum.ambassadorId, current);
    }
    return records.map((record) => toAmbassador(record, totals.get(record.id) ?? NO_COMMISSIONS));
  }

  async listCommissions(): Promise<AmbassadorCommissionResponse[]> {
    const records = await this.prisma.ambassadorCommission.findMany({
      orderBy: { createdAt: 'desc' },
      select: commissionSelect,
    });
    return records.map(toCommission);
  }

  async update(id: string, input: UpdateAmbassadorDto): Promise<AmbassadorResponse> {
    await this.findOrThrow(id);
    const note = input.adminNote === undefined ? undefined : input.adminNote?.trim() || null;
    await this.prisma.ambassador.update({
      where: { id },
      data: { status: input.status, adminNote: note },
      select: { id: true },
    });
    return this.getOne(id);
  }

  async resendWelcome(id: string): Promise<void> {
    if (!this.mail.isConfigured) throw new ServiceUnavailableException(MAIL_NOT_CONFIGURED);
    const ambassador = await this.findOrThrow(id);
    await this.sendWelcome(ambassador.email, ambassador.fullName, ambassador.code);
  }

  /** Only an ambassador who never referred a family may be deleted; others are suspended. */
  async remove(id: string): Promise<void> {
    const ambassador = await this.prisma.ambassador.findUnique({
      where: { id },
      select: { _count: { select: { families: true, commissions: true } } },
    });
    if (!ambassador) throw new NotFoundException(NOT_FOUND);
    if (ambassador._count.families > 0 || ambassador._count.commissions > 0) {
      throw new ConflictException(
        'Đại sứ này đã giới thiệu dòng họ nên không thể xóa. Hãy chuyển sang Tạm ngừng.',
      );
    }
    await this.prisma.ambassador.delete({ where: { id } });
  }

  /** Records that the admin transferred these commissions. Already paid ones are left as they were. */
  async markPaid(
    input: PayCommissionsDto,
    adminUserId: string,
  ): Promise<AmbassadorCommissionResponse[]> {
    const ids = [...new Set(input.ids)];
    const { count } = await this.prisma.ambassadorCommission.updateMany({
      where: { id: { in: ids }, paidAt: null },
      data: { paidAt: new Date(), paidById: adminUserId, paidNote: input.note?.trim() || null },
    });
    if (count === 0) {
      throw new ConflictException('Các khoản hoa hồng này đã được ghi nhận chi trả trước đó.');
    }
    const records = await this.prisma.ambassadorCommission.findMany({
      where: { id: { in: ids } },
      select: commissionSelect,
    });
    return records.map(toCommission);
  }

  private async createWithFreshCode(data: {
    fullName: string;
    phone: string;
    email: string;
  }): Promise<{ id: string; code: string; fullName: string } | null> {
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.ambassador.create({
          data: { ...data, code: generateAmbassadorCode(), consentAt: new Date() },
          select: { id: true, code: true, fullName: true },
        });
      } catch (error: unknown) {
        if (isUniqueViolation(error, 'email')) return null;
        if (!isUniqueViolation(error, 'code')) throw error;
      }
    }
    throw new ServiceUnavailableException('Chưa tạo được mã đại sứ. Vui lòng thử lại.');
  }

  private async sendWelcome(email: string, fullName: string, code: string): Promise<void> {
    const commissions = await this.prisma.pricingPlan.findMany({
      where: { isActive: true, price: { gt: 0 }, commissionPercent: { gt: 0 } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { name: true, price: true, commissionPercent: true },
    });
    try {
      await this.mail.send(
        ambassadorWelcomeMail({
          to: email,
          fullName,
          code,
          siteUrl: this.siteUrl(),
          commissions: commissions.map((plan) => ({
            planName: plan.name,
            percent: plan.commissionPercent,
            amount: commissionAmountFor(plan.price, plan.commissionPercent),
          })),
        }),
      );
    } catch {
      throw new ServiceUnavailableException(MAIL_FAILED);
    }
  }

  /** The public website: the first allowed web origin. */
  private siteUrl(): string {
    const origin = this.config.getOrThrow<string>('WEB_ORIGIN').split(',')[0] ?? '';
    return origin.trim().replace(/\/$/, '');
  }

  private async findOrThrow(
    id: string,
  ): Promise<{ id: string; email: string; fullName: string; code: string }> {
    const ambassador = await this.prisma.ambassador.findUnique({
      where: { id },
      select: { id: true, email: true, fullName: true, code: true },
    });
    if (!ambassador) throw new NotFoundException(NOT_FOUND);
    return ambassador;
  }

  private async getOne(id: string): Promise<AmbassadorResponse> {
    const [record, sums] = await Promise.all([
      this.prisma.ambassador.findUniqueOrThrow({ where: { id }, select: ambassadorSelect }),
      this.prisma.ambassadorCommission.groupBy({
        by: ['paidAt'],
        where: { ambassadorId: id },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);
    const totals = { ...NO_COMMISSIONS };
    for (const sum of sums) addToTotals(totals, sum);
    return toAmbassador(record, totals);
  }
}
