import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { FamilyAccountsController } from './family-accounts.controller.js';
import { FamilyAccountsService } from './family-accounts.service.js';

@Module({
  imports: [AuthModule],
  controllers: [FamilyAccountsController],
  providers: [FamilyAccountsService],
})
export class FamilyAccountsModule {}
