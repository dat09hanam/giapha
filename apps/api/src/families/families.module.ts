import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { FamiliesController } from './families.controller.js';
import { FamiliesService } from './families.service.js';
import { FamilyPlanExpiryService } from './family-plan-expiry.service.js';

@Module({
  imports: [AuthModule],
  controllers: [FamiliesController],
  providers: [FamiliesService, FamilyPlanExpiryService],
})
export class FamiliesModule {}
