import { Controller, Get, Inject } from '@nestjs/common';

import { DemoFamilyService, type DemoFamilySummary } from './demo-family.service.js';
import type { FamilyTreeResponse } from './family-tree.types.js';

/** Public and read-only: the sample family visitors can explore before signing in. */
@Controller('demo-family')
export class DemoFamilyController {
  constructor(@Inject(DemoFamilyService) private readonly demoFamily: DemoFamilyService) {}

  @Get()
  getDemoFamily(): Promise<DemoFamilySummary> {
    return this.demoFamily.getDemoFamily();
  }

  @Get('tree')
  getDemoTree(): Promise<FamilyTreeResponse> {
    return this.demoFamily.getDemoTree();
  }
}
