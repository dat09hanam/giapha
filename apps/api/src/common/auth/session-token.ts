import { createHash } from 'node:crypto';

import type { FastifyRequest } from 'fastify';

export const SESSION_COOKIE_NAME = 'giapha_session';

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function extractSessionToken(request: FastifyRequest): string | null {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    return token.length > 0 ? token : null;
  }

  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(';')) {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name === SESSION_COOKIE_NAME) {
      const value = valueParts.join('=');
      return value.length > 0 ? decodeURIComponent(value) : null;
    }
  }

  return null;
}

export function sessionCookie(token: string, expiresAt: Date, secure: boolean): string {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
    secure ? 'Secure' : null,
  ]
    .filter((part): part is string => part !== null)
    .join('; ');
}

export function expiredSessionCookie(secure: boolean): string {
  return [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
    secure ? 'Secure' : null,
  ]
    .filter((part): part is string => part !== null)
    .join('; ');
}
