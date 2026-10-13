import { Inject, Injectable } from '@nestjs/common';
import type { SiteContact } from '@prisma/client';

import { PrismaService } from '../database/prisma.service.js';
import type { SiteContactDto } from './site-contact.dto.js';

const ROW_ID = 1;

export type SiteContactResponse = Omit<SiteContact, 'id'>;

/** What the site shows if the row is ever missing; the migration seeds the same values. */
const FALLBACK: Omit<SiteContactResponse, 'updatedAt'> = {
  phone: '0123 456 789',
  zalo: null,
  email: 'support@giaphaviet.vn',
  address: 'Hà Nội, Việt Nam',
  hours: 'Hàng Ngày: 6:00 - 24:00',
  facebookUrl: null,
  youtubeUrl: null,
  tiktokUrl: null,
};

function toResponse({ id: _id, ...contact }: SiteContact): SiteContactResponse {
  return contact;
}

@Injectable()
export class SiteContactService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async get(): Promise<SiteContactResponse> {
    const row = await this.prisma.siteContact.findUnique({ where: { id: ROW_ID } });
    return row ? toResponse(row) : { ...FALLBACK, updatedAt: new Date(0) };
  }

  async update(input: SiteContactDto): Promise<SiteContactResponse> {
    const data = {
      phone: input.phone,
      zalo: input.zalo ?? null,
      email: input.email,
      address: input.address,
      hours: input.hours,
      facebookUrl: input.facebookUrl ?? null,
      youtubeUrl: input.youtubeUrl ?? null,
      tiktokUrl: input.tiktokUrl ?? null,
    };
    const row = await this.prisma.siteContact.upsert({
      where: { id: ROW_ID },
      create: { id: ROW_ID, ...data },
      update: data,
    });
    return toResponse(row);
  }
}
