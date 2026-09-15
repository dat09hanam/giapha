import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { FamiliesController } from './families.controller.js';
import { FamiliesService } from './families.service.js';

@Module({
  imports: [AuthModule],
  controllers: [FamiliesController],
  providers: [FamiliesService],
})
export class FamiliesModule {}
