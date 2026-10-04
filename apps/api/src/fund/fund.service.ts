import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FundEntryKind } from '@prisma/client';

import { formatCalendarDay, parseCalendarDay } from '../common/validation/calendar-day.js';
import { PrismaService } from '../database/prisma.service.js';
import type { SaveFundEntryDto } from './fund.dto.js';

/** The ledger lists the newest lines; totals always cover every line. */
const LIST_LIMIT = 1000;

export type FundEntryResponse = {
  id: string;
  content: string;
  kind: FundEntryKind;
  amount: number;
  /** `YYYY-MM-DD`. */
  occurredOn: string;
  createdAt: string;
  updatedAt: string;
};

export type FundResponse = {
  entries: FundEntryResponse[];
  totals: { income: number; expense: number; balance: number };
  /** Whether this viewer is the clan head, who records the ledger. */
  canManage: boolean;
};

type EntryRecord = {
  id: string;
  content: string;
  kind: FundEntryKind;
  amount: bigint;
  occurredOn: Date;
  createdAt: Date;
  updatedAt: Date;
};

function toResponse(entry: EntryRecord): FundEntryResponse {
  return {
    id: entry.id,
    content: entry.content,
    kind: entry.kind,
    // Amounts are capped far below 2^53, so a number is exact.
    amount: Number(entry.amount),
    // DATE columns come back as midnight UTC, so the ISO date is the stored day.
    occurredOn: formatCalendarDay(entry.occurredOn),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function cleanInput(input: SaveFundEntryDto): {
  content: string;
  kind: FundEntryKind;
  amount: bigint;
  occurredOn: Date;
} {
  const content = input.content.trim().replace(/\s+/g, ' ');
  if (!content) throw new BadRequestException('Vui lòng nhập nội dung khoản thu chi.');
  return {
    content,
    kind: input.kind,
    amount: BigInt(input.amount),
    occurredOn: parseCalendarDay(input.occurredOn, 'Ngày thu chi không hợp lệ.'),
  };
}

@Injectable()
export class FundService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getLedger(familyId: string, canManage: boolean): Promise<FundResponse> {
    const [entries, sums] = await Promise.all([
      this.prisma.fundEntry.findMany({
        where: { familyId },
        // Newest day first; lines of the same day in the order they were written, newest first.
        orderBy: [{ occurredOn: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: LIST_LIMIT,
      }),
      this.prisma.fundEntry.groupBy({
        by: ['kind'],
        where: { familyId },
        _sum: { amount: true },
      }),
    ]);
    const sumOf = (kind: FundEntryKind): number =>
      Number(sums.find((row) => row.kind === kind)?._sum.amount ?? 0n);
    const income = sumOf(FundEntryKind.INCOME);
    const expense = sumOf(FundEntryKind.EXPENSE);

    return {
      entries: entries.map(toResponse),
      totals: { income, expense, balance: income - expense },
      canManage,
    };
  }

  async create(familyId: string, input: SaveFundEntryDto): Promise<FundEntryResponse> {
    const entry = await this.prisma.fundEntry.create({ data: { familyId, ...cleanInput(input) } });
    return toResponse(entry);
  }

  async update(
    familyId: string,
    entryId: string,
    input: SaveFundEntryDto,
  ): Promise<FundEntryResponse> {
    // The family filter makes another family's line indistinguishable from a missing one.
    const { count } = await this.prisma.fundEntry.updateMany({
      where: { id: entryId, familyId },
      data: cleanInput(input),
    });
    if (count === 0) throw new NotFoundException('Không tìm thấy khoản thu chi này.');
    return toResponse(
      await this.prisma.fundEntry.findFirstOrThrow({ where: { id: entryId, familyId } }),
    );
  }

  async remove(familyId: string, entryId: string): Promise<void> {
    const { count } = await this.prisma.fundEntry.deleteMany({ where: { id: entryId, familyId } });
    if (count === 0) throw new NotFoundException('Không tìm thấy khoản thu chi này.');
  }
}
