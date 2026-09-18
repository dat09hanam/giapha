import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module.js';
import { validateEnvironment } from './config/environment.js';
import { DatabaseModule } from './database/database.module.js';
import { FamiliesModule } from './families/families.module.js';
import { FamilyTreeModule } from './family-tree/family-tree.module.js';
import { HealthModule } from './health/health.module.js';
import { MediaModule } from './media/media.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    FamiliesModule,
    FamilyTreeModule,
    MediaModule,
  ],
})
export class AppModule {}
