import { createHash } from 'node:crypto';

import { BadRequestException } from '@nestjs/common';

import type { AuthRequest } from '../common/auth/auth.types.js';

export const FEED_KEY_HEADER = 'x-feed-key';

const FEED_KEY_PATTERN = /^[0-9a-f]{32,128}$/;

export function readFeedKeyHash(request: AuthRequest): string | null {
  const raw = request.headers[FEED_KEY_HEADER];
  const key = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!FEED_KEY_PATTERN.test(key)) return null;
  return createHash('sha256').update(key).digest('hex');
}

export function requireFeedKeyHash(request: AuthRequest): string {
  const hash = readFeedKeyHash(request);
  if (!hash) {
    throw new BadRequestException('Thiết bị chưa có mã nhận diện. Hãy tải lại trang rồi thử lại.');
  }
  return hash;
}
