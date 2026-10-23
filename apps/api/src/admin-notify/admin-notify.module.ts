import { Module } from '@nestjs/common';

import { MailModule } from '../mail/mail.module.js';
import { AdminNotifyService } from './admin-notify.service.js';

@Module({
  imports: [MailModule],
  providers: [AdminNotifyService],
  exports: [AdminNotifyService],
})
export class AdminNotifyModule {}
