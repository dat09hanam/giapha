import { randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type Gender } from '@prisma/client';

import {
  daysBetween,
  isoDay,
  lunarMonthStarts,
  lunarToSolar,
  todayInVietnam,
  toLunar,
  type SolarDay,
} from '../common/lunar-calendar.js';
import { PrismaService } from '../database/prisma.service.js';
import { yearOf } from '../family-tree/person-dates.js';
import { MailService } from '../mail/mail.service.js';
import {
  anniversaryReminderMail,
  anniversarySubscribedMail,
  type AnniversaryMailInput,
} from './anniversary-mail.js';
import type { CreateAnniversaryReminderDto } from './anniversaries.dto.js';

/** Reminders one account may hold, and reminders per family; both far above normal use. */
const MAX_REMINDERS_PER_ACCOUNT = 200;
const MAX_REMINDERS_PER_FAMILY = 5000;

export type AnniversaryEntry = {
  personId: string;
  name: string;
  honorific: string | null;
  gender: Gender;
  generation: number | null;
  avatarUrl: string | null;
  lunarDay: number;
  lunarMonth: number;
  /** ISO solar day of this occurrence. */
  date: string;
  /** Which anniversary this is (1 = giỗ đầu), when the year of death is known. */
  anniversaryNumber: number | null;
};

export type AnniversaryReminderView = { id: string; personId: string; email: string };

/** A new reminder, and whether its first reminder email already went out with it. */
export type CreatedAnniversaryReminder = AnniversaryReminderView & {
  sentNow: boolean;
  /** Days until the next anniversary. */
  daysLeft: number;
};

/** Reminders go out this many days ahead; one set later than that is sent at once. */
export const REMIND_DAYS_AHEAD = 7;

export type AnniversaryCalendar = {
  year: number;
  today: string;
  familyName: string;
  /** The clan's shared anniversary (giỗ họ), when the clan head has set one. */
  familyAnniversary: { lunarDay: number; lunarMonth: number; dates: string[] } | null;
  /** First day of every lunar month touching the year, so the calendar can show lunar days. */
  lunarMonths: Array<{ date: string; lunarMonth: number; lunarYear: number; leap: boolean }>;
  anniversaries: AnniversaryEntry[];
  /** Reminders this account set. */
  reminders: AnniversaryReminderView[];
  accountEmail: string | null;
  mailEnabled: boolean;
};

/** Solar dates in `year` of a lunar day; a late-year lunar date can fall twice. */
export function occurrencesIn(year: number, lunarMonth: number, lunarDay: number): SolarDay[] {
  return [year - 1, year]
    .map((lunarYear) => lunarToSolar(lunarYear, lunarMonth, lunarDay))
    .filter((solar) => solar.year === year);
}

/** The next solar date of a lunar day, on or after `from`, with the lunar year it belongs to. */
export function nextOccurrence(
  from: SolarDay,
  lunarMonth: number,
  lunarDay: number,
): { date: SolarDay; lunarYear: number } {
  const fromLunarYear = toLunar(from).year;
  for (const lunarYear of [fromLunarYear - 1, fromLunarYear, fromLunarYear + 1]) {
    const date = lunarToSolar(lunarYear, lunarMonth, lunarDay);
    if (daysBetween(from, date) >= 0) return { date, lunarYear };
  }
  const lunarYear = fromLunarYear + 2;
  return { date: lunarToSolar(lunarYear, lunarMonth, lunarDay), lunarYear };
}

/** The lunar year someone died in: exact from a full date, else the solar year. */
function deathLunarYear(deathDate: string | null): number | null {
  const full = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(deathDate?.trim() ?? '');
  if (full) {
    return toLunar({ day: Number(full[1]), month: Number(full[2]), year: Number(full[3]) }).year;
  }
  return yearOf(deathDate);
}

@Injectable()
export class AnniversariesService {
  private readonly logger = new Logger(AnniversariesService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MailService) private readonly mail: MailService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async calendar(familyId: string, userId: string, year: number): Promise<AnniversaryCalendar> {
    const [family, people, reminders, account] = await Promise.all([
      this.prisma.family.findFirst({
        where: { id: familyId, deletedAt: null },
        select: { name: true, deathAnniversaryDay: true, deathAnniversaryMonth: true },
      }),
      this.prisma.person.findMany({
        where: { familyId, lunarDeathDay: { not: null }, lunarDeathMonth: { not: null } },
        select: {
          id: true,
          name: true,
          honorific: true,
          gender: true,
          generation: true,
          avatarUrl: true,
          deathDate: true,
          lunarDeathDay: true,
          lunarDeathMonth: true,
        },
      }),
      this.prisma.anniversaryReminder.findMany({
        where: { familyId, createdById: userId },
        select: { id: true, personId: true, email: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    ]);
    if (!family) throw new NotFoundException('Không tìm thấy dòng họ.');

    const anniversaries: AnniversaryEntry[] = [];
    for (const person of people) {
      const lunarDay = person.lunarDeathDay!;
      const lunarMonth = person.lunarDeathMonth!;
      if (lunarDay < 1 || lunarDay > 30 || lunarMonth < 1 || lunarMonth > 12) continue;
      const diedIn = deathLunarYear(person.deathDate);
      for (const date of occurrencesIn(year, lunarMonth, lunarDay)) {
        const occurrenceYear = toLunar(date).year;
        const number = diedIn === null ? null : occurrenceYear - diedIn;
        anniversaries.push({
          personId: person.id,
          name: person.name,
          honorific: person.honorific,
          gender: person.gender,
          generation: person.generation,
          avatarUrl: person.avatarUrl,
          lunarDay,
          lunarMonth,
          date: isoDay(date),
          anniversaryNumber: number !== null && number >= 1 ? number : null,
        });
      }
    }
    anniversaries.sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        (left.generation ?? 999) - (right.generation ?? 999) ||
        left.name.localeCompare(right.name, 'vi'),
    );

    const { deathAnniversaryDay: day, deathAnniversaryMonth: month } = family;
    return {
      year,
      today: isoDay(todayInVietnam()),
      familyName: family.name,
      familyAnniversary:
        day && month
          ? { lunarDay: day, lunarMonth: month, dates: occurrencesIn(year, month, day).map(isoDay) }
          : null,
      lunarMonths: lunarMonthStarts(year).map((start) => ({
        date: isoDay(start),
        lunarMonth: start.lunar.month,
        lunarYear: start.lunar.year,
        leap: start.lunar.leap,
      })),
      anniversaries,
      reminders,
      accountEmail: account?.email ?? null,
      mailEnabled: this.mail.isConfigured,
    };
  }

  async createReminder(
    familyId: string,
    familySlug: string,
    userId: string,
    input: CreateAnniversaryReminderDto,
  ): Promise<CreatedAnniversaryReminder> {
    if (!this.mail.isConfigured) {
      throw new ServiceUnavailableException(
        'Hệ thống chưa được cấu hình gửi email nên chưa đặt nhắc được. Vui lòng liên hệ Admin.',
      );
    }
    const email = input.email.trim().toLowerCase();
    const person = await this.prisma.person.findFirst({
      where: { id: input.personId, familyId },
      select: { id: true, name: true, lunarDeathDay: true, lunarDeathMonth: true },
    });
    if (!person) throw new NotFoundException('Không tìm thấy thành viên này trong dòng họ.');
    if (!person.lunarDeathDay || !person.lunarDeathMonth) {
      throw new BadRequestException('Thành viên này chưa có ngày giỗ.');
    }

    const next = nextOccurrence(todayInVietnam(), person.lunarDeathMonth, person.lunarDeathDay);
    const daysLeft = daysBetween(todayInVietnam(), next.date);
    // Inside the reminder window the one email sent now is the reminder itself, so the sweep must
    // see this occurrence as already reminded.
    const remindNow = daysLeft <= REMIND_DAYS_AHEAD;
    const occurrence = new Date(`${isoDay(next.date)}T00:00:00.000Z`);

    const existing = await this.prisma.anniversaryReminder.findUnique({
      where: { personId_email: { personId: person.id, email } },
      select: { id: true, personId: true, email: true },
    });
    if (existing) return { ...existing, sentNow: false, daysLeft };

    const [mine, inFamily] = await Promise.all([
      this.prisma.anniversaryReminder.count({ where: { createdById: userId } }),
      this.prisma.anniversaryReminder.count({ where: { familyId } }),
    ]);
    if (mine >= MAX_REMINDERS_PER_ACCOUNT || inFamily >= MAX_REMINDERS_PER_FAMILY) {
      throw new ConflictException('Đã đạt số lời nhắc tối đa. Hãy hủy bớt lời nhắc không cần nữa.');
    }

    const token = randomBytes(24).toString('base64url');
    let reminder: AnniversaryReminderView;
    try {
      reminder = await this.prisma.anniversaryReminder.create({
        data: {
          familyId,
          personId: person.id,
          email,
          createdById: userId,
          unsubscribeToken: token,
          lastSentFor: remindNow ? occurrence : null,
        },
        select: { id: true, personId: true, email: true },
      });
    } catch (error: unknown) {
      // Two clicks racing for the same person and address: the other one already saved it.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const saved = await this.prisma.anniversaryReminder.findUniqueOrThrow({
          where: { personId_email: { personId: person.id, email } },
          select: { id: true, personId: true, email: true },
        });
        return { ...saved, sentNow: false, daysLeft };
      }
      throw error;
    }

    const family = await this.prisma.family.findUniqueOrThrow({
      where: { id: familyId },
      select: { name: true },
    });
    const mailInput = this.mailInput({
      to: email,
      personName: person.name,
      familyName: family.name,
      familySlug,
      lunarDay: person.lunarDeathDay,
      lunarMonth: person.lunarDeathMonth,
      date: next.date,
      token,
    });
    try {
      await this.mail.send(
        remindNow ? anniversaryReminderMail(mailInput) : anniversarySubscribedMail(mailInput),
      );
    } catch {
      // The reminder stands; MailService has logged why the email did not go out. A reminder due
      // now is handed back to the sweep, which retries it within the hour.
      this.logger.warn('Anniversary reminder saved, but its first email was not sent.');
      if (remindNow) {
        await this.prisma.anniversaryReminder.updateMany({
          where: { id: reminder.id, lastSentFor: occurrence },
          data: { lastSentFor: null },
        });
        return { ...reminder, sentNow: false, daysLeft };
      }
    }
    return { ...reminder, sentNow: remindNow, daysLeft };
  }

  /** The account that set a reminder may cancel it, and so may the clan head. */
  async deleteReminder(
    familyId: string,
    userId: string,
    isClanHead: boolean,
    reminderId: string,
  ): Promise<void> {
    const reminder = await this.prisma.anniversaryReminder.findFirst({
      where: { id: reminderId, familyId },
      select: { createdById: true },
    });
    if (!reminder) throw new NotFoundException('Không tìm thấy lời nhắc này.');
    if (reminder.createdById !== userId && !isClanHead) {
      throw new ForbiddenException('Bạn chỉ hủy được lời nhắc do mình đặt.');
    }
    await this.prisma.anniversaryReminder.deleteMany({ where: { id: reminderId, familyId } });
  }

  /** The unsubscribe link in each email: the token alone identifies the one reminder. */
  async unsubscribe(token: string): Promise<{ personName: string; familyName: string }> {
    const reminder = await this.prisma.anniversaryReminder.findUnique({
      where: { unsubscribeToken: token },
      select: { id: true, person: { select: { name: true } }, family: { select: { name: true } } },
    });
    if (!reminder) {
      throw new NotFoundException('Lời nhắc này đã được hủy trước đó hoặc không tồn tại.');
    }
    await this.prisma.anniversaryReminder.deleteMany({ where: { id: reminder.id } });
    return { personName: reminder.person.name, familyName: reminder.family.name };
  }

  mailInput(input: {
    to: string;
    personName: string;
    familyName: string;
    familySlug: string;
    lunarDay: number;
    lunarMonth: number;
    date: SolarDay;
    token: string;
  }): AnniversaryMailInput {
    const origin = this.config.getOrThrow<string>('WEB_ORIGIN').split(',')[0] ?? '';
    return {
      to: input.to,
      personName: input.personName,
      familyName: input.familyName,
      lunarDay: input.lunarDay,
      lunarMonth: input.lunarMonth,
      date: isoDay(input.date),
      daysLeft: Math.max(0, daysBetween(todayInVietnam(), input.date)),
      calendarUrl: `${origin}/${encodeURIComponent(input.familySlug)}/lich-gio`,
      unsubscribeUrl: `${origin}/huy-nhac-gio?token=${encodeURIComponent(input.token)}`,
    };
  }
}
