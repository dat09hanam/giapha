import type { ConfigService } from '@nestjs/config';
import type { FastifyReply } from 'fastify';

import { sessionCookie, type SessionCookieOptions } from '../common/auth/session-token.js';
import type { AuthProfile, AuthResult } from './auth.service.js';

export function sessionCookieOptions(config: ConfigService): SessionCookieOptions {
  return {
    secure: config.get<string>('NODE_ENV') === 'production',
    domain: config.get<string>('SESSION_COOKIE_DOMAIN'),
  };
}

/** Hands the new session to the browser as its cookie and returns the signed-in profile. */
export function replyWithSession(
  reply: FastifyReply,
  result: AuthResult,
  config: ConfigService,
): AuthProfile {
  reply.header(
    'Set-Cookie',
    sessionCookie(result.session.token, result.session.expiresAt, sessionCookieOptions(config)),
  );
  return result.profile;
}
