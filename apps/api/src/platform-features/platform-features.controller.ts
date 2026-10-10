import { Body, Controller, Get, Header, Inject, Patch, UseGuards } from '@nestjs/common';

import { PlatformAdminGuard } from '../common/auth/platform-admin.guard.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import type { FamilyFeatures } from '../common/family-features.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdatePlatformFeaturesDto } from './platform-features.dto.js';
import { PlatformFeaturesService } from './platform-features.service.js';

@Controller('platform-features')
export class PlatformFeaturesController {
  constructor(
    @Inject(PlatformFeaturesService) private readonly features: PlatformFeaturesService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  getFeatures(): Promise<FamilyFeatures> {
    return this.features.getFeatures();
  }

  @Patch()
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @Header('Cache-Control', 'no-store')
  updateFeatures(@Body() input: UpdatePlatformFeaturesDto): Promise<FamilyFeatures> {
    return this.features.updateFeatures(input);
  }
}
