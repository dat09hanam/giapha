import {
  HttpException,
  HttpStatus,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const MAX_TRACKED_KEYS = 10_000;

type AttemptWindow = { count: number; resetAt: number };

@Injectable()
export class AuthThrottleGuard implements CanActivate {
  private readonly attempts = new Map<string, AttemptWindow>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const now = Date.now();
    const route = request.routeOptions?.url ?? request.url;
    const key = `${request.ip}:${route}`;
    const current = this.attempts.get(key);

    if (!current || current.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
      this.pruneExpired(now);
      return true;
    }

    if (current.count >= MAX_ATTEMPTS) {
      throw new HttpException(
        'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
    return true;
  }

  private pruneExpired(now: number): void {
    if (this.attempts.size <= MAX_TRACKED_KEYS) {
      return;
    }

    for (const [key, attempt] of this.attempts) {
      if (attempt.resetAt <= now) {
        this.attempts.delete(key);
      }
    }

    while (this.attempts.size > MAX_TRACKED_KEYS) {
      const oldestKey = this.attempts.keys().next().value;
      if (!oldestKey) {
        break;
      }

      this.attempts.delete(oldestKey);
    }
  }
}
