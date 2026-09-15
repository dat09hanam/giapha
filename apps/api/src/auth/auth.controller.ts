import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply } from 'fastify';

import type { AuthRequest } from '../common/auth/auth.types.js';
import { AuthThrottleGuard } from '../common/auth/auth-throttle.guard.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import {
  expiredSessionCookie,
  extractSessionToken,
  sessionCookie,
} from '../common/auth/session-token.js';
import { AuthService, type AuthProfile, type AuthResult } from './auth.service.js';
// Runtime imports are required for Nest's emitted DTO validation metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { LoginDto } from './dto/login.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RegisterClanHeadDto } from './dto/register-clan-head.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  @Post('register/clan-head')
  @UseGuards(AuthThrottleGuard)
  async registerClanHead(
    @Body() input: RegisterClanHeadDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthProfile> {
    return this.finishAuthentication(await this.authService.registerClanHead(input), reply);
  }

  @Post('invitations/accept')
  @UseGuards(AuthThrottleGuard)
  async acceptInvitation(
    @Body() input: AcceptInvitationDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthProfile> {
    return this.finishAuthentication(await this.authService.acceptInvitation(input), reply);
  }

  @Post('login')
  @UseGuards(AuthThrottleGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthProfile> {
    return this.finishAuthentication(await this.authService.login(input), reply);
  }

  @Post('logout')
  @UseGuards(SessionAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.authService.logout(extractSessionToken(request));
    reply.header('Set-Cookie', expiredSessionCookie(this.isSecureCookie()));
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  getMe(@Req() request: AuthRequest): Promise<AuthProfile> {
    if (!request.auth) {
      throw new UnauthorizedException('Authentication is required');
    }

    return this.authService.getProfile(request.auth.userId);
  }

  private finishAuthentication(result: AuthResult, reply: FastifyReply): AuthProfile {
    reply.header(
      'Set-Cookie',
      sessionCookie(result.session.token, result.session.expiresAt, this.isSecureCookie()),
    );
    return result.profile;
  }

  private isSecureCookie(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }
}
