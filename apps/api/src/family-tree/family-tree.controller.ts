import { Controller, Get, Inject, Param, Query } from '@nestjs/common';

import { TenantSlugPipe } from '../common/pipes/tenant-slug.pipe.js';
// Runtime import is required for Nest's emitted DTO validation metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { FamilyTreeQueryDto } from './dto/family-tree-query.dto.js';
import { FamilyTreeService } from './family-tree.service.js';
import type { FamilyTreeResponse } from './family-tree.types.js';

@Controller('tenants/:slug/tree')
export class FamilyTreeController {
  constructor(@Inject(FamilyTreeService) private readonly familyTreeService: FamilyTreeService) {}

  @Get()
  getTree(
    @Param('slug', TenantSlugPipe) slug: string,
    @Query() query: FamilyTreeQueryDto,
  ): Promise<FamilyTreeResponse> {
    return this.familyTreeService.getPublicTree(slug, query.family);
  }
}
