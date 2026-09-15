import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { FamilySlugPipe } from './family-slug.pipe.js';

describe('FamilySlugPipe', () => {
  const pipe = new FamilySlugPipe();

  it('normalizes a valid slug', () => {
    expect(pipe.transform('  Nguyen-Van  ')).toBe('nguyen-van');
  });

  it.each(['a', 'nguyen_van', '-nguyen', 'nguyen--van', 'admin', 'login', 'register'])(
    'rejects invalid or reserved slug %s',
    (slug) => {
      expect(() => pipe.transform(slug)).toThrow(BadRequestException);
    },
  );
});
