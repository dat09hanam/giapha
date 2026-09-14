import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from './config/environment.js';
import { DatabaseModule } from './database/database.module.js';
import { FamilyTreeModule } from './family-tree/family-tree.module.js';
import { HealthModule } from './health/health.module.js';
import { TenantsModule } from './tenants/tenants.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    DatabaseModule,
    HealthModule,
    TenantsModule,
    FamilyTreeModule,
  ],
})
export class AppModule {}
