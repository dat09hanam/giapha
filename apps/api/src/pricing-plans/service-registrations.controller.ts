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

import { AuthThrottleGuard } from '../common/auth/auth-throttle.guard.js';
import { PlatformAdminGuard } from '../common/auth/platform-admin.guard.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  CreateServiceRegistrationDto,
  UpdateServiceRegistrationDto,
} from './service-registration.dto.js';
import {
  ServiceRegistrationsService,
  type ServiceRegistrationResponse,
} from './service-registrations.service.js';

@Controller('service-registrations')
export class ServiceRegistrationsController {
  constructor(
    @Inject(ServiceRegistrationsService)
    private readonly registrations: ServiceRegistrationsService,
  ) {}

  @Post()
  @UseGuards(AuthThrottleGuard)
  @HttpCode(204)
  create(@Body() input: CreateServiceRegistrationDto): Promise<void> {
    return this.registrations.create(input);
  }

  @Get()
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @Header('Cache-Control', 'no-store')
  list(): Promise<ServiceRegistrationResponse[]> {
    return this.registrations.listAll();
  }

  @Patch(':id')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateServiceRegistrationDto,
  ): Promise<ServiceRegistrationResponse> {
    return this.registrations.update(id, input);
  }

  @Delete(':id')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.registrations.remove(id);
  }
}
