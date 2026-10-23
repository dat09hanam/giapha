import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MailModule } from '../mail/mail.module.js';
import {
  AnniversariesController,
  AnniversaryUnsubscribeController,
} from './anniversaries.controller.js';
import { AnniversariesService } from './anniversaries.service.js';
import { AnniversaryReminderSweepService } from './anniversary-reminder-sweep.service.js';

@Module({
  imports: [AuthModule, MailModule],
  controllers: [AnniversariesController, AnniversaryUnsubscribeController],
  providers: [AnniversariesService, AnniversaryReminderSweepService],
})
export class AnniversariesModule {}
