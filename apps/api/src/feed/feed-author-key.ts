import { createHash } from 'node:crypto';

import { BadRequestException } from '@nestjs/common';

import type { AuthRequest } from '../common/auth/auth.types.js';

/**
 * The whole family shares one account, so the session cannot tell members
 * apart. Each device instead keeps a random key and sends it in this header;
 * only its SHA-256 is stored, and it decides who may edit or delete a post or
 * comment and which reaction is "mine". It is not a security boundary between
 * relatives, just ownership of what one typed.
 */
export const FEED_KEY_HEADER = 'x-feed-key';

const FEED_KEY_PATTERN = /^[0-9a-f]{32,128}$/;

/** The hashed device key, or null when the request has none. */
export function readFeedKeyHash(request: AuthRequest): string | null {
  const raw = request.headers[FEED_KEY_HEADER];
  const key = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!FEED_KEY_PATTERN.test(key)) return null;
  return createHash('sha256').update(key).digest('hex');
}

/** As readFeedKeyHash, for writes that need to know whose they are. */
export function requireFeedKeyHash(request: AuthRequest): string {
  const hash = readFeedKeyHash(request);
  if (!hash) {
    throw new BadRequestException('Thiết bị chưa có mã nhận diện. Hãy tải lại trang rồi thử lại.');
  }
  return hash;
}
