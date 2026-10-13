import { Body, Controller, Get, Header, Inject, Put, UseGuards } from '@nestjs/common';

import { PlatformAdminGuard } from '../common/auth/platform-admin.guard.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SiteContactDto } from './site-contact.dto.js';
import { SiteContactService, type SiteContactResponse } from './site-contact.service.js';

@Controller('site-contact')
export class SiteContactController {
  constructor(@Inject(SiteContactService) private readonly contact: SiteContactService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  get(): Promise<SiteContactResponse> {
    return this.contact.get();
  }

  @Put()
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  update(@Body() input: SiteContactDto): Promise<SiteContactResponse> {
    return this.contact.update(input);
  }
}
