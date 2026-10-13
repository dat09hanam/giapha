import { resolve } from 'node:path';

import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { familyStorageBytes } from '../common/family-storage.js';
import { PrismaService } from '../database/prisma.service.js';

const RECONCILE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Resets every family's `storageUsedBytes` to what its media folder really takes, fixing drift
 * from crashes between a write and its counter update or from files removed by hand. Runs when
 * the API starts and daily after. A family whose counter changes while its folder is measured is
 * left for the next run, so uploads and deletes finishing meanwhile are not overwritten; only a
 * file reserved but not yet written at that moment can be missed, until the next run. Idempotent
 * and safe to run on every API instance.
 */
@Injectable()
export class FamilyStorageReconcileService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FamilyStorageReconcileService.name);
  private readonly root: string;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(ConfigService) config: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {
    this.root = resolve(config.getOrThrow<string>('MEDIA_ROOT'));
  }

  onModuleInit(): void {
    void this.reconcile();
    this.timer = setInterval(() => void this.reconcile(), RECONCILE_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async reconcile(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const families = await this.prisma.family.findMany({ select: { id: true } });
      let corrected = 0;
      // One family at a time keeps the disk load of a run small.
      for (const { id } of families) {
        const before = await this.prisma.family.findUnique({
          where: { id },
          select: { storageUsedBytes: true },
        });
        if (!before) continue;
        const measured = BigInt(await familyStorageBytes(this.root, id));
        if (measured === before.storageUsedBytes) continue;
        const { count } = await this.prisma.family.updateMany({
          where: { id, storageUsedBytes: before.storageUsedBytes },
          data: { storageUsedBytes: measured },
        });
        corrected += count;
      }
      if (corrected > 0) this.logger.log(`Corrected storage usage of ${corrected} families.`);
    } catch (error: unknown) {
      this.logger.error('Storage reconcile failed.', error instanceof Error ? error.stack : error);
    } finally {
      this.running = false;
    }
  }
}
