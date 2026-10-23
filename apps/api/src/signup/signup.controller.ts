import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply } from 'fastify';

import type { AuthProfile } from '../auth/auth.service.js';
import { GoogleIdTokenVerifier } from '../auth/google-id-token.js';
import { replyWithSession } from '../auth/session-reply.js';
import { AuthThrottleGuard } from '../common/auth/auth-throttle.guard.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { GoogleSignupDto } from './dto/google-signup.dto.js';
import { SignupService } from './signup.service.js';

export type GoogleSignupResponse = {
  profile: AuthProfile;
  member: { username: string; password: string };
};

@Controller('auth/google')
export class SignupController {
  constructor(
    @Inject(SignupService) private readonly signup: SignupService,
    @Inject(GoogleIdTokenVerifier) private readonly google: GoogleIdTokenVerifier,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  @Post('register')
  @UseGuards(AuthThrottleGuard)
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  async register(
    @Body() input: GoogleSignupDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<GoogleSignupResponse> {
    const identity = await this.google.verify(input.credential);
    const result = await this.signup.registerWithGoogle(identity, input);
    return { profile: replyWithSession(reply, result, this.config), member: result.member };
  }
}
