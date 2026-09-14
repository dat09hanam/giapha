import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { TenantSlugPipe } from './tenant-slug.pipe.js';

describe('TenantSlugPipe', () => {
  const pipe = new TenantSlugPipe();

  it('normalizes a valid slug', () => {
    expect(pipe.transform('  Nguyen-Van  ')).toBe('nguyen-van');
  });

  it.each(['a', 'nguyen_van', '-nguyen', 'nguyen--van'])('rejects invalid slug %s', (slug) => {
    expect(() => pipe.transform(slug)).toThrow(BadRequestException);
  });
});
