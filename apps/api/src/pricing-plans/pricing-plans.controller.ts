import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { PlatformAdminGuard } from '../common/auth/platform-admin.guard.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PricingPlanDto } from './pricing-plan.dto.js';
import type { PricingPlanResponse } from './pricing-plan.types.js';
import { PricingPlansService } from './pricing-plans.service.js';

@Controller('pricing-plans')
export class PricingPlansController {
  constructor(@Inject(PricingPlansService) private readonly plans: PricingPlansService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(): Promise<PricingPlanResponse[]> {
    return this.plans.listActive();
  }

  @Get('admin')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @Header('Cache-Control', 'no-store')
  listAll(): Promise<PricingPlanResponse[]> {
    return this.plans.listAll();
  }

  @Post()
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  create(@Body() input: PricingPlanDto): Promise<PricingPlanResponse> {
    return this.plans.create(input);
  }

  @Patch(':id')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: PricingPlanDto,
  ): Promise<PricingPlanResponse> {
    return this.plans.update(id, input);
  }

  @Delete(':id')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.plans.remove(id);
  }
}
