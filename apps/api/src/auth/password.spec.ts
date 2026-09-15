import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies the original password without storing it', async () => {
    const hash = await hashPassword('Mat-khau-rat-manh-2026');

    expect(hash).not.toContain('Mat-khau-rat-manh-2026');
    await expect(verifyPassword('Mat-khau-rat-manh-2026', hash)).resolves.toBe(true);
    await expect(verifyPassword('mat-khau-sai', hash)).resolves.toBe(false);
  });

  it('rejects malformed hashes', async () => {
    await expect(verifyPassword('anything', 'not-a-password-hash')).resolves.toBe(false);
  });
});
