import { HttpException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AuthThrottleGuard } from './auth-throttle.guard.js';

function httpContext(ip: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ ip, url: '/api/auth/login', routeOptions: { url: '/auth/login' } }),
    }),
  } as unknown as ExecutionContext;
}

describe('AuthThrottleGuard', () => {
  it('limits repeated authentication attempts by IP and route', () => {
    const guard = new AuthThrottleGuard();
    const context = httpContext('127.0.0.1');

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(guard.canActivate(context)).toBe(true);
    }

    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });

  it('keeps independent limits for different IP addresses', () => {
    const guard = new AuthThrottleGuard();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      guard.canActivate(httpContext('127.0.0.1'));
    }

    expect(guard.canActivate(httpContext('127.0.0.2'))).toBe(true);
  });
});
