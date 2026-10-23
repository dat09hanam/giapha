import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { FamilyStatus } from '@prisma/client';

import { daysBetween, isoDay, todayInVietnam } from '../common/lunar-calendar.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { anniversaryReminderMail } from './anniversary-mail.js';
import {
  AnniversariesService,
  REMIND_DAYS_AHEAD,
  nextOccurrence,
} from './anniversaries.service.js';

const SWEEP_INTERVAL_MS = 60 * 60 * 1000;
const BATCH_SIZE = 500;

/**
 * Hourly job emailing death-anniversary reminders a week ahead. Each reminder is claimed by
 * writing the occurrence into `lastSentFor` before sending, so several API instances never send
 * the same occurrence twice; a failed send releases the claim for the next sweep.
 */
@Injectable()
export class AnniversaryReminderSweepService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnniversaryReminderSweepService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MailService) private readonly mail: MailService,
    @Inject(AnniversariesService) private readonly anniversaries: AnniversariesService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
    this.timer.unref();
    void this.sweep();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep(): Promise<void> {
    if (this.running || !this.mail.isConfigured) return;
    this.running = true;
    let sent = 0;
    try {
      const today = todayInVietnam();
      let cursor: string | undefined;
      for (;;) {
        const batch = await this.prisma.anniversaryReminder.findMany({
          where: { family: { status: FamilyStatus.ACTIVE, deletedAt: null } },
          orderBy: { id: 'asc' },
          take: BATCH_SIZE,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          select: {
            id: true,
            email: true,
            unsubscribeToken: true,
            lastSentFor: true,
            person: { select: { name: true, lunarDeathDay: true, lunarDeathMonth: true } },
            family: { select: { name: true, slug: true } },
          },
        });
        if (batch.length === 0) break;
        cursor = batch.at(-1)!.id;

        for (const reminder of batch) {
          const { lunarDeathDay: day, lunarDeathMonth: month } = reminder.person;
          if (!day || !month) continue;
          const next = nextOccurrence(today, month, day);
          const daysLeft = daysBetween(today, next.date);
          if (daysLeft > REMIND_DAYS_AHEAD) continue;
          const occurrence = new Date(`${isoDay(next.date)}T00:00:00.000Z`);
          if (reminder.lastSentFor?.getTime() === occurrence.getTime()) continue;

          const claimed = await this.prisma.anniversaryReminder.updateMany({
            where: { id: reminder.id, lastSentFor: reminder.lastSentFor },
            data: { lastSentFor: occurrence },
          });
          if (claimed.count === 0) continue;
          try {
            await this.mail.send(
              anniversaryReminderMail(
                this.anniversaries.mailInput({
                  to: reminder.email,
                  personName: reminder.person.name,
                  familyName: reminder.family.name,
                  familySlug: reminder.family.slug,
                  lunarDay: day,
                  lunarMonth: month,
                  date: next.date,
                  token: reminder.unsubscribeToken,
                }),
              ),
            );
            sent += 1;
          } catch {
            await this.prisma.anniversaryReminder.updateMany({
              where: { id: reminder.id, lastSentFor: occurrence },
              data: { lastSentFor: reminder.lastSentFor },
            });
          }
        }
      }
      if (sent > 0) this.logger.log(`Sent ${sent} death anniversary reminders.`);
    } catch (error: unknown) {
      this.logger.error(
        'Death anniversary reminder sweep failed.',
        error instanceof Error ? error.stack : error,
      );
    } finally {
      this.running = false;
    }
  }
}
