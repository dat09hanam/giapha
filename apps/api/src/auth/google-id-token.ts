import { createPublicKey, verify, type JsonWebKey, type KeyObject } from 'node:crypto';

import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
/** Used when Google's response carries no max-age. */
const DEFAULT_KEYS_TTL_MS = 60 * 60 * 1000;
/** Tolerated clock difference with Google, in seconds. */
const CLOCK_SKEW_S = 60;
const INVALID_MESSAGE = 'Đăng nhập Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.';

/** What a verified Google ID token says about the person. */
export type GoogleIdentity = {
  sub: string;
  email: string;
  name: string | null;
};

type TokenHeader = { alg?: unknown; kid?: unknown };
type TokenPayload = {
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
};

function decodePart<T>(part: string): T {
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T;
  } catch {
    throw new UnauthorizedException(INVALID_MESSAGE);
  }
}

/**
 * Checks a Google Identity Services ID token (the `credential` the sign-in button returns) against
 * Google's published signing keys, without a client library.
 */
@Injectable()
export class GoogleIdTokenVerifier {
  private keys: Map<string, KeyObject> = new Map();
  private keysExpireAt = 0;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  get enabled(): boolean {
    return Boolean(this.clientId());
  }

  async verify(credential: string): Promise<GoogleIdentity> {
    const clientId = this.clientId();
    if (!clientId) {
      throw new ServiceUnavailableException('Đăng nhập bằng Google chưa được cấu hình.');
    }

    const parts = credential.split('.');
    if (parts.length !== 3) throw new UnauthorizedException(INVALID_MESSAGE);
    const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];
    const header = decodePart<TokenHeader>(headerPart);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
      throw new UnauthorizedException(INVALID_MESSAGE);
    }

    const key = await this.signingKey(header.kid);
    const signed = verify(
      'RSA-SHA256',
      Buffer.from(`${headerPart}.${payloadPart}`),
      key,
      Buffer.from(signaturePart, 'base64url'),
    );
    if (!signed) throw new UnauthorizedException(INVALID_MESSAGE);

    const payload = decodePart<TokenPayload>(payloadPart);
    const now = Date.now() / 1000;
    if (
      typeof payload.iss !== 'string' ||
      !GOOGLE_ISSUERS.has(payload.iss) ||
      payload.aud !== clientId ||
      typeof payload.exp !== 'number' ||
      payload.exp + CLOCK_SKEW_S < now ||
      typeof payload.sub !== 'string' ||
      !payload.sub
    ) {
      throw new UnauthorizedException(INVALID_MESSAGE);
    }
    if (typeof payload.email !== 'string' || payload.email_verified !== true) {
      throw new UnauthorizedException('Tài khoản Google này chưa xác minh email.');
    }

    return {
      sub: payload.sub,
      email: payload.email.trim().toLowerCase(),
      name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : null,
    };
  }

  private clientId(): string | undefined {
    return this.config.get<string>('GOOGLE_CLIENT_ID');
  }

  private async signingKey(kid: string): Promise<KeyObject> {
    // Google rotates keys; an unknown kid triggers one refetch before the token is refused.
    if (Date.now() >= this.keysExpireAt || !this.keys.has(kid)) await this.refreshKeys();
    const key = this.keys.get(kid);
    if (!key) throw new UnauthorizedException(INVALID_MESSAGE);
    return key;
  }

  private async refreshKeys(): Promise<void> {
    let response: Response;
    try {
      response = await fetch(GOOGLE_CERTS_URL, { signal: AbortSignal.timeout(5000) });
    } catch {
      throw new ServiceUnavailableException('Không kết nối được tới Google. Vui lòng thử lại sau.');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('Không kết nối được tới Google. Vui lòng thử lại sau.');
    }
    const body = (await response.json()) as { keys?: (JsonWebKey & { kid?: string })[] };
    const keys = new Map<string, KeyObject>();
    for (const jwk of body.keys ?? []) {
      if (jwk.kid) keys.set(jwk.kid, createPublicKey({ key: jwk, format: 'jwk' }));
    }
    const maxAge = /max-age=(\d+)/.exec(response.headers.get('cache-control') ?? '')?.[1];
    this.keys = keys;
    this.keysExpireAt = Date.now() + (maxAge ? Number(maxAge) * 1000 : DEFAULT_KEYS_TTL_MS);
  }
}
