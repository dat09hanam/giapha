import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ArticlesModule } from './articles/articles.module.js';
import { AuthModule } from './auth/auth.module.js';
import { validateEnvironment } from './config/environment.js';
import { DatabaseModule } from './database/database.module.js';
import { EditSuggestionsModule } from './edit-suggestions/edit-suggestions.module.js';
import { FamiliesModule } from './families/families.module.js';
import { FamilyAccountsModule } from './family-accounts/family-accounts.module.js';
import { FeedModule } from './feed/feed.module.js';
import { FundModule } from './fund/fund.module.js';
import { LibraryModule } from './library/library.module.js';
import { FamilyTreeModule } from './family-tree/family-tree.module.js';
import { HealthModule } from './health/health.module.js';
import { MediaModule } from './media/media.module.js';
import { MeritModule } from './merit/merit.module.js';
import { PlatformFeaturesModule } from './platform-features/platform-features.module.js';
import { PosterDecorationsModule } from './poster-decorations/poster-decorations.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    FamiliesModule,
    FamilyAccountsModule,
    FamilyTreeModule,
    MediaModule,
    PosterDecorationsModule,
    EditSuggestionsModule,
    FeedModule,
    FundModule,
    MeritModule,
    LibraryModule,
    PlatformFeaturesModule,
    ArticlesModule,
  ],
})
export class AppModule {}
