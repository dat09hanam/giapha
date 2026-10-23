import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { AuthThrottleGuard } from '../common/auth/auth-throttle.guard.js';
import { MailModule } from '../mail/mail.module.js';
import { AmbassadorsController } from './ambassadors.controller.js';
import { AmbassadorsService } from './ambassadors.service.js';

/** Ambassador programme: public sign-up with an emailed code, admin list and commission payouts. */
@Module({
  imports: [AuthModule, MailModule],
  controllers: [AmbassadorsController],
  providers: [AmbassadorsService, AuthThrottleGuard],
})
export class AmbassadorsModule {}
