import { Controller, Get, Inject, Param } from '@nestjs/common';

import { TenantSlugPipe } from '../common/pipes/tenant-slug.pipe.js';
import { TenantsService, type TenantSummary } from './tenants.service.js';

@Controller('tenants')
export class TenantsController {
  constructor(@Inject(TenantsService) private readonly tenantsService: TenantsService) {}

  @Get(':slug')
  getTenant(@Param('slug', TenantSlugPipe) slug: string): Promise<TenantSummary> {
    return this.tenantsService.getPublicTenant(slug);
  }
}
