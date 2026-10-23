import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FamilyStatus, PlanPaymentStatus, Prisma } from '@prisma/client';

import { AdminNotifyService, type AdminEvent } from '../admin-notify/admin-notify.service.js';
import { renewedExpiry } from '../common/family-plan.js';
import { planRightsSelect, resolvePlanRights } from '../common/plan-rights.js';
import { PrismaService } from '../database/prisma.service.js';
import { FamiliesService } from '../families/families.service.js';
import {
  findPaymentCode,
  generatePaymentCode,
  isSepayAuthorized,
  sepayWebhookSchema,
  vietQrUrl,
} from './sepay.js';

/** How long a QR is offered before a fresh one is issued; a late transfer still counts. */
const OFFER_MS = 24 * 60 * 60 * 1000;
/** A pending code this close to its end is not handed out again. */
const REUSE_MARGIN_MS = 30 * 60 * 1000;
const CODE_ATTEMPTS = 5;

const PAYMENTS_OFF = 'Thanh toán trực tuyến chưa được bật. Vui lòng liên hệ Admin để gia hạn.';

const paymentSelect = {
  id: true,
  code: true,
  planName: true,
  amount: true,
  durationMonths: true,
  status: true,
  expiresAt: true,
  paidAt: true,
  extendedTo: true,
} satisfies Prisma.PlanPaymentSelect;

type PaymentRecord = Prisma.PlanPaymentGetPayload<{ select: typeof paymentSelect }>;

/** A renewal payment as the clan head sees it, with what to transfer. */
export type PlanRenewal = {
  id: string;
  code: string;
  planName: string;
  amount: number;
  durationMonths: number;
  status: PlanPaymentStatus;
  expiresAt: string;
  paidAt: string | null;
  extendedTo: string | null;
  /** The plan end date if paid now. */
  previewExpiresAt: string;
  transfer: {
    bank: string;
    accountNumber: string;
    accountName: string | null;
    content: string;
    qrUrl: string;
  };
};

type BankAccount = { bank: string; accountNumber: string; accountName: string | null };

@Injectable()
export class PlanPaymentService {
  private readonly logger = new Logger(PlanPaymentService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(FamiliesService) private readonly families: FamiliesService,
    @Inject(AdminNotifyService) private readonly notifier: AdminNotifyService,
  ) {}

  /** True when the clan head can renew by bank transfer from the plan page. */
  get isEnabled(): boolean {
    return this.bankAccount() !== null && Boolean(this.config.get('SEPAY_WEBHOOK_API_KEY'));
  }

  /**
   * Issues (or hands back) the transfer that renews the family's plan for one more period, at
   * the price the family was put on the plan for.
   */
  async createRenewal(familyId: string): Promise<PlanRenewal> {
    const account = this.bankAccount();
    if (!account || !this.isEnabled) throw new ServiceUnavailableException(PAYMENTS_OFF);
    const family = await this.prisma.family.findFirst({
      where: {
        id: familyId,
        deletedAt: null,
        status: { in: [FamilyStatus.ACTIVE, FamilyStatus.EXPIRED] },
      },
      select: {
        isDemo: true,
        planId: true,
        planPrice: true,
        planExpiresAt: true,
        plan: { select: { name: true, ...planRightsSelect } },
      },
    });
    if (!family) throw new NotFoundException('Không tìm thấy dòng họ.');
    const { durationMonths } = resolvePlanRights(family.plan.features);
    if (family.isDemo || durationMonths === null) {
      throw new BadRequestException('Gói của dòng họ không có thời hạn nên không cần gia hạn.');
    }
    if (family.planPrice <= 0) {
      throw new BadRequestException(
        'Gói miễn phí không gia hạn qua chuyển khoản. Hãy chọn gói khác để nâng cấp.',
      );
    }

    const now = Date.now();
    const open = await this.prisma.planPayment.findFirst({
      where: {
        familyId,
        status: PlanPaymentStatus.PENDING,
        planId: family.planId,
        amount: family.planPrice,
        durationMonths,
        expiresAt: { gt: new Date(now + REUSE_MARGIN_MS) },
      },
      orderBy: { createdAt: 'desc' },
      select: paymentSelect,
    });
    const payment = open ?? (await this.issue(familyId, family, durationMonths, now));
    return this.toRenewal(payment, account, family.planExpiresAt);
  }

  async getRenewal(familyId: string, paymentId: string): Promise<PlanRenewal> {
    const account = this.bankAccount();
    const [payment, family] = await Promise.all([
      this.prisma.planPayment.findFirst({
        where: { id: paymentId, familyId },
        select: paymentSelect,
      }),
      this.prisma.family.findUnique({ where: { id: familyId }, select: { planExpiresAt: true } }),
    ]);
    if (!payment || !family) throw new NotFoundException('Không tìm thấy lần thanh toán này.');
    if (!account) throw new ServiceUnavailableException(PAYMENTS_OFF);
    return this.toRenewal(payment, account, family.planExpiresAt);
  }

  /**
   * Applies a SePay "money in" notice. A transfer is matched to a pending payment by its code;
   * anything that cannot be applied safely is left for the admin, who is told about it.
   */
  async handleSepayWebhook(authorization: string | undefined, body: unknown): Promise<void> {
    const apiKey = this.config.get<string>('SEPAY_WEBHOOK_API_KEY');
    if (!apiKey || !isSepayAuthorized(authorization, apiKey)) {
      throw new UnauthorizedException('Webhook không hợp lệ.');
    }
    const parsed = sepayWebhookSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Dữ liệu webhook không hợp lệ.');
    const transfer = parsed.data;
    if (transfer.transferType !== 'in') return;

    const prefix = this.config.getOrThrow<string>('SEPAY_CODE_PREFIX');
    const code =
      findPaymentCode(transfer.code, prefix) ?? findPaymentCode(transfer.content, prefix);
    // Not one of ours: the bank account may receive other money too.
    if (!code) return;

    const payment = await this.prisma.planPayment.findUnique({
      where: { code },
      select: {
        id: true,
        familyId: true,
        planId: true,
        planName: true,
        amount: true,
        durationMonths: true,
        status: true,
        sepayTransactionId: true,
        family: { select: { name: true } },
      },
    });
    if (payment?.sepayTransactionId === transfer.id) return;
    // A transaction already recorded against another payment: a resent notice.
    if (
      await this.prisma.planPayment.count({ where: { sepayTransactionId: transfer.id } })
    ) {
      return;
    }

    const review = (reason: string): AdminEvent => ({
      kind: 'PAYMENT_REVIEW',
      reason,
      code,
      amount: transfer.transferAmount,
      familyName: payment?.family.name ?? null,
    });
    if (!payment) {
      this.notifier.notify(review('Không tìm thấy mã thanh toán này.'));
      return;
    }
    if (payment.status !== PlanPaymentStatus.PENDING) {
      this.notifier.notify(review('Mã này đã được thanh toán trước đó; khoản này là chuyển thêm.'));
      return;
    }

    let event: AdminEvent;
    try {
      event = await this.prisma.$transaction(async (db) => {
        const family = await db.family.findUnique({
          where: { id: payment.familyId },
          select: { planId: true, deletedAt: true },
        });
        const problem =
          transfer.transferAmount < payment.amount
            ? `Chuyển thiếu: cần ${payment.amount.toLocaleString('vi-VN')}đ.`
            : !family || family.deletedAt
              ? 'Dòng họ đã bị xóa.'
              : family.planId !== payment.planId
                ? 'Dòng họ đã đổi sang gói khác sau khi tạo mã.'
                : null;
        // Only a still-pending payment is claimed, so two notices never both apply.
        const claimed = await db.planPayment.updateMany({
          where: { id: payment.id, status: PlanPaymentStatus.PENDING },
          data: {
            status: problem ? PlanPaymentStatus.REVIEW : PlanPaymentStatus.PAID,
            sepayTransactionId: transfer.id,
            paidAmount: transfer.transferAmount,
            paidAt: new Date(),
          },
        });
        if (claimed.count === 0) throw new AlreadyApplied();
        if (problem) return review(problem);

        const extendedTo = await this.families.extendPlan(
          payment.familyId,
          payment.durationMonths,
          db,
        );
        await db.planPayment.update({
          where: { id: payment.id },
          data: { extendedTo },
          select: { id: true },
        });
        return {
          kind: 'PLAN_RENEWED',
          familyName: payment.family.name,
          planName: payment.planName,
          amount: transfer.transferAmount,
          extendedTo,
        } satisfies AdminEvent;
      });
    } catch (error: unknown) {
      if (error instanceof AlreadyApplied) return;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return;
      this.logger.error(`Applying SePay transaction ${transfer.id} failed.`);
      throw error;
    }
    this.notifier.notify(event);
  }

  private async issue(
    familyId: string,
    family: { planId: string; planPrice: number; plan: { name: string } },
    durationMonths: number,
    now: number,
  ): Promise<PaymentRecord> {
    const prefix = this.config.getOrThrow<string>('SEPAY_CODE_PREFIX');
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.planPayment.create({
          data: {
            familyId,
            code: generatePaymentCode(prefix),
            planId: family.planId,
            planName: family.plan.name,
            amount: family.planPrice,
            durationMonths,
            expiresAt: new Date(now + OFFER_MS),
          },
          select: paymentSelect,
        });
      } catch (error: unknown) {
        const codeTaken =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!codeTaken) throw error;
      }
    }
    throw new ServiceUnavailableException('Chưa tạo được mã thanh toán. Vui lòng thử lại.');
  }

  private toRenewal(
    payment: PaymentRecord,
    account: BankAccount,
    planExpiresAt: Date | null,
  ): PlanRenewal {
    return {
      id: payment.id,
      code: payment.code,
      planName: payment.planName,
      amount: payment.amount,
      durationMonths: payment.durationMonths,
      status: payment.status,
      expiresAt: payment.expiresAt.toISOString(),
      paidAt: payment.paidAt?.toISOString() ?? null,
      extendedTo: payment.extendedTo?.toISOString() ?? null,
      previewExpiresAt: renewedExpiry(
        planExpiresAt,
        payment.durationMonths,
        new Date(),
      ).toISOString(),
      transfer: {
        ...account,
        content: payment.code,
        qrUrl: vietQrUrl({ ...account, amount: payment.amount, content: payment.code }),
      },
    };
  }

  private bankAccount(): BankAccount | null {
    const bank = this.config.get<string>('SEPAY_BANK');
    const accountNumber = this.config.get<string>('SEPAY_ACCOUNT_NUMBER');
    if (!bank || !accountNumber) return null;
    return { bank, accountNumber, accountName: this.config.get<string>('SEPAY_ACCOUNT_NAME') ?? null };
  }
}

/** The payment was claimed by another notice while this one ran. */
class AlreadyApplied extends Error {}
