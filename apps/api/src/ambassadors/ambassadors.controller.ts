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
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AuthThrottleGuard } from '../common/auth/auth-throttle.guard.js';
import type { AuthRequest } from '../common/auth/auth.types.js';
import { PlatformAdminGuard } from '../common/auth/platform-admin.guard.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateAmbassadorDto, PayCommissionsDto, UpdateAmbassadorDto } from './ambassador.dto.js';
import {
  AmbassadorsService,
  type AmbassadorCommissionResponse,
  type AmbassadorResponse,
  type AmbassadorSignupResult,
} from './ambassadors.service.js';

@Controller('ambassadors')
export class AmbassadorsController {
  constructor(@Inject(AmbassadorsService) private readonly ambassadors: AmbassadorsService) {}

  @Post()
  @UseGuards(AuthThrottleGuard)
  @Header('Cache-Control', 'no-store')
  register(@Body() input: CreateAmbassadorDto): Promise<AmbassadorSignupResult> {
    return this.ambassadors.register(input);
  }

  @Get()
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @Header('Cache-Control', 'no-store')
  list(): Promise<AmbassadorResponse[]> {
    return this.ambassadors.listAll();
  }

  @Get('commissions')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @Header('Cache-Control', 'no-store')
  listCommissions(): Promise<AmbassadorCommissionResponse[]> {
    return this.ambassadors.listCommissions();
  }

  @Post('commissions/pay')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @HttpCode(200)
  markPaid(
    @Body() input: PayCommissionsDto,
    @Req() request: AuthRequest,
  ): Promise<AmbassadorCommissionResponse[]> {
    if (!request.auth)
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    return this.ambassadors.markPaid(input, request.auth.userId);
  }

  @Patch(':id')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateAmbassadorDto,
  ): Promise<AmbassadorResponse> {
    return this.ambassadors.update(id, input);
  }

  @Post(':id/welcome-email')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @HttpCode(204)
  resendWelcome(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.ambassadors.resendWelcome(id);
  }

  @Delete(':id')
  @UseGuards(SessionAuthGuard, PlatformAdminGuard)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.ambassadors.remove(id);
  }
}
