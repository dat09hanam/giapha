import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { PosterDecorationsController } from './poster-decorations.controller.js';
import { PosterDecorationsService } from './poster-decorations.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PosterDecorationsController],
  providers: [PosterDecorationsService],
})
export class PosterDecorationsModule {}
