import { Module } from '@nestjs/common';

import { AdminNotifyModule } from '../admin-notify/admin-notify.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthThrottleGuard } from '../common/auth/auth-throttle.guard.js';
import { FamiliesModule } from '../families/families.module.js';
import { FamilyPlanController } from './family-plan.controller.js';
import { FamilyPlanService } from './family-plan.service.js';
import { PricingPlansController } from './pricing-plans.controller.js';
import { PricingPlansService } from './pricing-plans.service.js';
import { ServiceRegistrationsController } from './service-registrations.controller.js';
import { ServiceRegistrationsService } from './service-registrations.service.js';

@Module({
  imports: [AdminNotifyModule, AuthModule, FamiliesModule],
  controllers: [PricingPlansController, ServiceRegistrationsController, FamilyPlanController],
  providers: [
    PricingPlansService,
    ServiceRegistrationsService,
    FamilyPlanService,
    AuthThrottleGuard,
  ],
})
export class PricingPlansModule {}
