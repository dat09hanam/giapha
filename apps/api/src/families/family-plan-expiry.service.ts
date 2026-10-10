import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { FamilyStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service.js';

const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Moves families whose plan has run out to EXPIRED. Access checks already treat a lapsed
 * `planExpiresAt` as expired, so the sweep only makes the stored status catch up; it is
 * idempotent and safe to run on every API instance.
 */
@Injectable()
export class FamilyPlanExpiryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FamilyPlanExpiryService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    void this.sweep();
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async sweep(): Promise<void> {
    try {
      const { count } = await this.prisma.family.updateMany({
        where: { status: FamilyStatus.ACTIVE, planExpiresAt: { lte: new Date() } },
        data: { status: FamilyStatus.EXPIRED },
      });
      if (count > 0) this.logger.log(`Moved ${count} families to EXPIRED.`);
    } catch (error: unknown) {
      this.logger.error('Plan expiry sweep failed.', error instanceof Error ? error.stack : error);
    }
  }
}
