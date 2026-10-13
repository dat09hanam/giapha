import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { SiteContactController } from './site-contact.controller.js';
import { SiteContactService } from './site-contact.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SiteContactController],
  providers: [SiteContactService],
})
export class SiteContactModule {}
