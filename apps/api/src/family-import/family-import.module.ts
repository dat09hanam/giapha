import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { FamilyImportController } from './family-import.controller.js';
import { FamilyImportService } from './family-import.service.js';

@Module({
  imports: [AuthModule],
  controllers: [FamilyImportController],
  providers: [FamilyImportService],
})
export class FamilyImportModule {}
