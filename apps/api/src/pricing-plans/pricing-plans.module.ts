import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { AuthThrottleGuard } from '../common/auth/auth-throttle.guard.js';
import { PricingPlansController } from './pricing-plans.controller.js';
import { PricingPlansService } from './pricing-plans.service.js';
import { ServiceRegistrationsController } from './service-registrations.controller.js';
import { ServiceRegistrationsService } from './service-registrations.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PricingPlansController, ServiceRegistrationsController],
  providers: [PricingPlansService, ServiceRegistrationsService, AuthThrottleGuard],
})
export class PricingPlansModule {}
