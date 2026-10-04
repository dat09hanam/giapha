import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { PlatformFeaturesController } from './platform-features.controller.js';
import { PlatformFeaturesService } from './platform-features.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PlatformFeaturesController],
  providers: [PlatformFeaturesService],
})
export class PlatformFeaturesModule {}
