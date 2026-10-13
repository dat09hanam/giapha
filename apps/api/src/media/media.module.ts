import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { FamilyStorageReconcileService } from './family-storage-reconcile.service.js';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [MediaService, FamilyStorageReconcileService],
  exports: [MediaService],
})
export class MediaModule {}
