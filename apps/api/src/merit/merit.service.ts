import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MeritDonationKind } from '@prisma/client';

import { formatCalendarDay, parseCalendarDay } from '../common/validation/calendar-day.js';
import { PrismaService } from '../database/prisma.service.js';
import type { SaveMeritDonationDto, SaveMeritEventDto } from './merit.dto.js';

/** An event lists its newest donations; totals always cover every donation. */
const DONATION_LIMIT = 2000;

const EVENT_NOT_FOUND = 'Không tìm thấy sự kiện công đức này.';
const DONATION_NOT_FOUND = 'Không tìm thấy lượt công đức này.';

export type MeritTotals = {
  /** Sum of cash donations, whole đồng. */
  cashAmount: number;
  cashCount: number;
  itemCount: number;
};

export type MeritEventResponse = {
  id: string;
  title: string;
  description: string | null;
  /** `YYYY-MM-DD`, or null when the occasion has no fixed day. */
  heldOn: string | null;
  createdAt: string;
  updatedAt: string;
  totals: MeritTotals;
};

export type MeritDonationResponse = {
  id: string;
  eventId: string;
  donorName: string;
  kind: MeritDonationKind;
  amount: number | null;
  itemContent: string | null;
  note: string | null;
  /** `YYYY-MM-DD`. */
  donatedOn: string;
  createdAt: string;
  updatedAt: string;
};

export type MeritOverviewResponse = {
  events: MeritEventResponse[];
  /** Whether this viewer is the clan head, who records donations. */
  canManage: boolean;
};

export type MeritEventDetailResponse = {
  event: MeritEventResponse;
  donations: MeritDonationResponse[];
  canManage: boolean;
};

type EventRecord = {
  id: string;
  title: string;
  description: string | null;
  heldOn: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type DonationRecord = {
  id: string;
  eventId: string;
  donorName: string;
  kind: MeritDonationKind;
  amount: bigint | null;
  itemContent: string | null;
  note: string | null;
  donatedOn: Date;
  createdAt: Date;
  updatedAt: Date;
};

type TotalsRow = {
  eventId: string;
  kind: MeritDonationKind;
  _count: { _all: number };
  _sum: { amount: bigint | null };
};

const EMPTY_TOTALS: MeritTotals = { cashAmount: 0, cashCount: 0, itemCount: 0 };

function totalsByEvent(rows: TotalsRow[]): Map<string, MeritTotals> {
  const totals = new Map<string, MeritTotals>();
  for (const row of rows) {
    const current = { ...(totals.get(row.eventId) ?? EMPTY_TOTALS) };
    if (row.kind === MeritDonationKind.CASH) {
      current.cashAmount += Number(row._sum.amount ?? 0n);
      current.cashCount += row._count._all;
    } else {
      current.itemCount += row._count._all;
    }
    totals.set(row.eventId, current);
  }
  return totals;
}

function toEventResponse(event: EventRecord, totals: MeritTotals): MeritEventResponse {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    // DATE columns come back as midnight UTC, so the ISO date is the stored day.
    heldOn: event.heldOn ? formatCalendarDay(event.heldOn) : null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    totals,
  };
}

function toDonationResponse(donation: DonationRecord): MeritDonationResponse {
  return {
    id: donation.id,
    eventId: donation.eventId,
    donorName: donation.donorName,
    kind: donation.kind,
    // Amounts are capped far below 2^53, so a number is exact.
    amount: donation.amount === null ? null : Number(donation.amount),
    itemContent: donation.itemContent,
    note: donation.note,
    donatedOn: formatCalendarDay(donation.donatedOn),
    createdAt: donation.createdAt.toISOString(),
    updatedAt: donation.updatedAt.toISOString(),
  };
}

/** Collapses runs of whitespace; an empty result is null. */
function cleanText(value: string | null | undefined): string | null {
  const text = value?.trim().replace(/\s+/g, ' ');
  return text ? text : null;
}

function cleanEvent(input: SaveMeritEventDto): {
  title: string;
  description: string | null;
  heldOn: Date | null;
} {
  const title = cleanText(input.title);
  if (!title) throw new BadRequestException('Vui lòng nhập tên sự kiện.');
  // Line breaks in a description are kept; only its ends are trimmed.
  const description = input.description?.trim() || null;
  return {
    title,
    description,
    heldOn: input.heldOn ? parseCalendarDay(input.heldOn, 'Ngày tổ chức không hợp lệ.') : null,
  };
}

function cleanDonation(input: SaveMeritDonationDto): {
  donorName: string;
  kind: MeritDonationKind;
  amount: bigint | null;
  itemContent: string | null;
  note: string | null;
  donatedOn: Date;
} {
  const donorName = cleanText(input.donorName);
  if (!donorName) throw new BadRequestException('Vui lòng nhập tên người công đức.');
  const common = {
    donorName,
    kind: input.kind,
    note: cleanText(input.note),
    donatedOn: parseCalendarDay(input.donatedOn, 'Ngày công đức không hợp lệ.'),
  };

  if (input.kind === MeritDonationKind.CASH) {
    if (!input.amount) throw new BadRequestException('Vui lòng nhập số tiền công đức.');
    return {
      ...common,
      amount: BigInt(input.amount),
      itemContent: null,
    };
  }

  const itemContent = cleanText(input.itemContent);
  if (!itemContent) throw new BadRequestException('Vui lòng nhập nội dung hiện vật công đức.');
  return { ...common, amount: null, itemContent };
}

@Injectable()
export class MeritService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getOverview(familyId: string, canManage: boolean): Promise<MeritOverviewResponse> {
    const [events, rows] = await Promise.all([
      this.prisma.meritEvent.findMany({
        where: { familyId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.meritDonation.groupBy({
        by: ['eventId', 'kind'],
        where: { familyId },
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);
    const totals = totalsByEvent(rows);
    return {
      events: events.map((event) => toEventResponse(event, totals.get(event.id) ?? EMPTY_TOTALS)),
      canManage,
    };
  }

  async getEvent(
    familyId: string,
    eventId: string,
    canManage: boolean,
  ): Promise<MeritEventDetailResponse> {
    const event = await this.findEvent(familyId, eventId);
    const [donations, totals] = await Promise.all([
      this.prisma.meritDonation.findMany({
        where: { familyId, eventId },
        // Newest day first; donations of the same day in the order they were written, newest first.
        orderBy: [{ donatedOn: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: DONATION_LIMIT,
      }),
      this.eventTotals(familyId, eventId),
    ]);
    return {
      event: toEventResponse(event, totals),
      donations: donations.map(toDonationResponse),
      canManage,
    };
  }

  async createEvent(familyId: string, input: SaveMeritEventDto): Promise<MeritEventResponse> {
    const event = await this.prisma.meritEvent.create({ data: { familyId, ...cleanEvent(input) } });
    return toEventResponse(event, EMPTY_TOTALS);
  }

  async updateEvent(
    familyId: string,
    eventId: string,
    input: SaveMeritEventDto,
  ): Promise<MeritEventResponse> {
    // The family filter makes another family's event indistinguishable from a missing one.
    const { count } = await this.prisma.meritEvent.updateMany({
      where: { id: eventId, familyId },
      data: cleanEvent(input),
    });
    if (count === 0) throw new NotFoundException(EVENT_NOT_FOUND);
    const [event, totals] = await Promise.all([
      this.findEvent(familyId, eventId),
      this.eventTotals(familyId, eventId),
    ]);
    return toEventResponse(event, totals);
  }

  /** Removes the event and, through the foreign key, every donation recorded for it. */
  async removeEvent(familyId: string, eventId: string): Promise<void> {
    const { count } = await this.prisma.meritEvent.deleteMany({ where: { id: eventId, familyId } });
    if (count === 0) throw new NotFoundException(EVENT_NOT_FOUND);
  }

  async createDonation(
    familyId: string,
    eventId: string,
    input: SaveMeritDonationDto,
  ): Promise<MeritDonationResponse> {
    await this.findEvent(familyId, eventId);
    const donation = await this.prisma.meritDonation.create({
      data: { familyId, eventId, ...cleanDonation(input) },
    });
    return toDonationResponse(donation);
  }

  async updateDonation(
    familyId: string,
    donationId: string,
    input: SaveMeritDonationDto,
  ): Promise<MeritDonationResponse> {
    const { count } = await this.prisma.meritDonation.updateMany({
      where: { id: donationId, familyId },
      data: cleanDonation(input),
    });
    if (count === 0) throw new NotFoundException(DONATION_NOT_FOUND);
    return toDonationResponse(
      await this.prisma.meritDonation.findFirstOrThrow({ where: { id: donationId, familyId } }),
    );
  }

  async removeDonation(familyId: string, donationId: string): Promise<void> {
    const { count } = await this.prisma.meritDonation.deleteMany({
      where: { id: donationId, familyId },
    });
    if (count === 0) throw new NotFoundException(DONATION_NOT_FOUND);
  }

  private async findEvent(familyId: string, eventId: string): Promise<EventRecord> {
    const event = await this.prisma.meritEvent.findFirst({ where: { id: eventId, familyId } });
    if (!event) throw new NotFoundException(EVENT_NOT_FOUND);
    return event;
  }

  private async eventTotals(familyId: string, eventId: string): Promise<MeritTotals> {
    const rows = await this.prisma.meritDonation.groupBy({
      by: ['eventId', 'kind'],
      where: { familyId, eventId },
      _count: { _all: true },
      _sum: { amount: true },
    });
    return totalsByEvent(rows).get(eventId) ?? EMPTY_TOTALS;
  }
}
