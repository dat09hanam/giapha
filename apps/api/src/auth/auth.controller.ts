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
import { AllowPendingPasswordChange } from '../common/auth/password-change.decorator.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import {
  expiredSessionCookie,
  extractSessionToken,
  sessionCookie,
} from '../common/auth/session-token.js';
import { AuthService, type AuthProfile, type AuthResult } from './auth.service.js';
// Runtime imports are required for Nest's emitted DTO validation metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ChangePasswordDto } from './dto/change-password.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { LoginDto } from './dto/login.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
  VerifyPasswordResetDto,
} from './dto/password-reset.dto.js';
import { PasswordResetService, type PasswordResetRequested } from './password-reset.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(PasswordResetService) private readonly passwordReset: PasswordResetService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  @Post('login')
  @UseGuards(AuthThrottleGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthProfile> {
    return this.finishAuthentication(await this.authService.login(input), reply);
  }

  /** Mails a one-time code and names the masked email; `404` when no account matches. */
  @Post('password-reset')
  @UseGuards(AuthThrottleGuard)
  @HttpCode(HttpStatus.OK)
  requestPasswordReset(@Body() input: RequestPasswordResetDto): Promise<PasswordResetRequested> {
    return this.passwordReset.request(input);
  }

  /** Checks the mailed code before the form asks for a new password; nothing changes yet. */
  @Post('password-reset/verify')
  @UseGuards(AuthThrottleGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  verifyPasswordReset(@Body() input: VerifyPasswordResetDto): Promise<void> {
    return this.passwordReset.verify(input);
  }

  @Post('password-reset/confirm')
  @UseGuards(AuthThrottleGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  confirmPasswordReset(@Body() input: ConfirmPasswordResetDto): Promise<void> {
    return this.passwordReset.confirm(input);
  }

  @Post('logout')
  @UseGuards(SessionAuthGuard)
  @AllowPendingPasswordChange()
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
  @AllowPendingPasswordChange()
  getMe(@Req() request: AuthRequest): Promise<AuthProfile> {
    if (!request.auth) {
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    }

    return this.authService.getProfile(request.auth.userId);
  }

  @Post('password')
  @UseGuards(AuthThrottleGuard, SessionAuthGuard)
  @AllowPendingPasswordChange()
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Body() input: ChangePasswordDto,
    @Req() request: AuthRequest,
  ): Promise<AuthProfile> {
    if (!request.auth) {
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    }

    return this.authService.changePassword(request.auth.userId, request.auth.sessionId, input);
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
