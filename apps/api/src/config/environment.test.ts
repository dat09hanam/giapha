import { describe, expect, it } from 'vitest';

import { validateEnvironment } from './environment.js';

const databaseUrl = 'mysql://test:test@localhost:3306/test';

describe('validateEnvironment', () => {
  it('defaults to the origin used by the local web command', () => {
    expect(validateEnvironment({ DATABASE_URL: databaseUrl })).toMatchObject({
      PORT: 4000,
      WEB_ORIGIN: 'http://localhost:3005',
    });
  });

  it('preserves configured origins and coerces the API port', () => {
    expect(validateEnvironment({
      DATABASE_URL: databaseUrl,
      PORT: '4100',
      WEB_ORIGIN: 'https://family.example,https://admin.example',
    })).toMatchObject({
      PORT: 4100,
      WEB_ORIGIN: 'https://family.example,https://admin.example',
    });
  });

  it.each(['0', '65536', 'invalid'])('rejects invalid port %s', (port) => {
    expect(() => validateEnvironment({ DATABASE_URL: databaseUrl, PORT: port })).toThrow();
  });

  it('requires a MySQL database URL', () => {
    expect(() => validateEnvironment({})).toThrow();
    expect(() => validateEnvironment({ DATABASE_URL: 'postgresql://localhost/test' })).toThrow();
  });
});
