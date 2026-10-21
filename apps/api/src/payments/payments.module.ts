import { Module } from '@nestjs/common';

import { AdminNotifyModule } from '../admin-notify/admin-notify.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { FamiliesModule } from '../families/families.module.js';
import { PlanPaymentController } from './plan-payment.controller.js';
import { PlanPaymentService } from './plan-payment.service.js';
import { SepayWebhookController } from './sepay-webhook.controller.js';

/** Plan renewals paid by VietQR bank transfer and confirmed by the SePay webhook. */
@Module({
  imports: [AdminNotifyModule, AuthModule, FamiliesModule],
  controllers: [PlanPaymentController, SepayWebhookController],
  providers: [PlanPaymentService],
  exports: [PlanPaymentService],
})
export class PaymentsModule {}
