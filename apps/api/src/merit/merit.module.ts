import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MeritController } from './merit.controller.js';
import { MeritService } from './merit.service.js';

@Module({
  imports: [AuthModule],
  controllers: [MeritController],
  providers: [MeritService],
})
export class MeritModule {}
