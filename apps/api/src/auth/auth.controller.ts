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
import { expiredSessionCookie, extractSessionToken } from '../common/auth/session-token.js';
import { AuthService, type AuthProfile } from './auth.service.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ChangePasswordDto } from './dto/change-password.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { GoogleCredentialDto } from './dto/google-credential.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { LoginDto } from './dto/login.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
  VerifyPasswordResetDto,
} from './dto/password-reset.dto.js';
import { GoogleIdTokenVerifier } from './google-id-token.js';
import { PasswordResetService, type PasswordResetRequested } from './password-reset.service.js';
import { replyWithSession, sessionCookieOptions } from './session-reply.js';

/** A Google sign-in either opens a session or asks the person to register a family first. */
export type GoogleLoginResult =
  | { status: 'signed-in'; profile: AuthProfile }
  | { status: 'needs-registration'; email: string; name: string | null };

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(PasswordResetService) private readonly passwordReset: PasswordResetService,
    @Inject(GoogleIdTokenVerifier) private readonly google: GoogleIdTokenVerifier,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  @Post('login')
  @UseGuards(AuthThrottleGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthProfile> {
    return replyWithSession(reply, await this.authService.login(input), this.config);
  }

  @Post('google')
  @UseGuards(AuthThrottleGuard)
  @HttpCode(HttpStatus.OK)
  async loginWithGoogle(
    @Body() input: GoogleCredentialDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<GoogleLoginResult> {
    const identity = await this.google.verify(input.credential);
    const result = await this.authService.loginWithGoogle(identity);
    if (!result) {
      return { status: 'needs-registration', email: identity.email, name: identity.name };
    }
    return { status: 'signed-in', profile: replyWithSession(reply, result, this.config) };
  }

  /** Links the signed-in account to the Google account that just verified in the browser. */
  @Post('google/link')
  @UseGuards(AuthThrottleGuard, SessionAuthGuard)
  @HttpCode(HttpStatus.OK)
  async linkGoogle(
    @Body() input: GoogleCredentialDto,
    @Req() request: AuthRequest,
  ): Promise<AuthProfile> {
    if (!request.auth) {
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện thao tác này.');
    }
    const identity = await this.google.verify(input.credential);
    return this.authService.linkGoogle(request.auth.userId, identity);
  }

  @Post('password-reset')
  @UseGuards(AuthThrottleGuard)
  @HttpCode(HttpStatus.OK)
  requestPasswordReset(@Body() input: RequestPasswordResetDto): Promise<PasswordResetRequested> {
    return this.passwordReset.request(input);
  }

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
    reply.header('Set-Cookie', expiredSessionCookie(sessionCookieOptions(this.config)));
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
}
