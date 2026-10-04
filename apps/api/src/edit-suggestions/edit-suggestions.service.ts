import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SuggestionStatus, type Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service.js';
import type { CreateEditSuggestionDto } from './dto/create-edit-suggestion.dto.js';
import type {
  CreatedEditSuggestionResponse,
  EditSuggestionResponse,
} from './edit-suggestions.types.js';

/** A shared account can be used by anyone in the clan; this caps how much an unread queue can grow. */
const MAX_PENDING_PER_FAMILY = 200;
/** The review list shows the most recent suggestions; older closed ones drop off. */
const LIST_LIMIT = 300;

const SUGGESTION_SELECT = {
  id: true,
  proposerName: true,
  content: true,
  status: true,
  createdAt: true,
  reviewedAt: true,
  person: { select: { id: true, name: true, honorific: true } },
} satisfies Prisma.EditSuggestionSelect;

type SuggestionRecord = Prisma.EditSuggestionGetPayload<{ select: typeof SUGGESTION_SELECT }>;

function toResponse(record: SuggestionRecord): EditSuggestionResponse {
  return {
    id: record.id,
    person: record.person,
    proposerName: record.proposerName,
    content: record.content,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    reviewedAt: record.reviewedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class EditSuggestionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(
    familyId: string,
    personId: string,
    input: CreateEditSuggestionDto,
  ): Promise<CreatedEditSuggestionResponse> {
    const proposerName = input.proposerName.trim();
    const content = input.content.trim();
    if (!proposerName) throw new BadRequestException('Vui lòng nhập tên người đề xuất.');
    if (!content) throw new BadRequestException('Vui lòng nhập nội dung đề xuất.');

    const person = await this.prisma.person.findFirst({
      where: { id: personId, familyId },
      select: { id: true },
    });
    if (!person) throw new NotFoundException('Không tìm thấy thành viên này trong dòng họ.');

    const pending = await this.prisma.editSuggestion.count({
      where: { familyId, status: SuggestionStatus.PENDING },
    });
    if (pending >= MAX_PENDING_PER_FAMILY) {
      throw new ServiceUnavailableException(
        'Trưởng họ đang có quá nhiều đề xuất chưa xem. Vui lòng gửi lại sau.',
      );
    }

    const created = await this.prisma.editSuggestion.create({
      data: { familyId, personId, proposerName, content },
      select: { id: true, status: true, createdAt: true },
    });
    return { ...created, createdAt: created.createdAt.toISOString() };
  }

  /** Newest first; the web app groups them by status. */
  async list(familyId: string): Promise<EditSuggestionResponse[]> {
    const records = await this.prisma.editSuggestion.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
      select: SUGGESTION_SELECT,
    });
    return records.map(toResponse);
  }

  async updateStatus(
    familyId: string,
    suggestionId: string,
    status: SuggestionStatus,
  ): Promise<EditSuggestionResponse> {
    // The family filter makes another family's suggestion indistinguishable from a missing one.
    const { count } = await this.prisma.editSuggestion.updateMany({
      where: { id: suggestionId, familyId },
      data: {
        status,
        reviewedAt: status === SuggestionStatus.PENDING ? null : new Date(),
      },
    });
    if (count === 0) throw new NotFoundException('Không tìm thấy đề xuất này.');

    const record = await this.prisma.editSuggestion.findFirstOrThrow({
      where: { id: suggestionId, familyId },
      select: SUGGESTION_SELECT,
    });
    return toResponse(record);
  }
}
