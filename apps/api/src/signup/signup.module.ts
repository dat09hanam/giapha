import { Module } from '@nestjs/common';

import { AdminNotifyModule } from '../admin-notify/admin-notify.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { FamiliesModule } from '../families/families.module.js';
import { SignupController } from './signup.controller.js';
import { SignupService } from './signup.service.js';

/** Self-service sign-up: a Google account opens a family on the free plan as its clan head. */
@Module({
  imports: [AdminNotifyModule, AuthModule, FamiliesModule],
  controllers: [SignupController],
  providers: [SignupService],
})
export class SignupModule {}
