import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { FundController } from './fund.controller.js';
import { FundService } from './fund.service.js';

@Module({
  imports: [AuthModule],
  controllers: [FundController],
  providers: [FundService],
})
export class FundModule {}
