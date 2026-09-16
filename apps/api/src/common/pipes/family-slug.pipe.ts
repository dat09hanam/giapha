import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

const FAMILY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_FAMILY_SLUGS = new Set(['admin', 'api', 'login', 'register']);

export function normalizeFamilySlug(value: string): string {
  const slug = value.trim().toLowerCase();
  if (
    slug.length < 2 ||
    slug.length > 100 ||
    !FAMILY_SLUG_PATTERN.test(slug) ||
    RESERVED_FAMILY_SLUGS.has(slug)
  ) {
    throw new BadRequestException('Family slug is invalid');
  }
  return slug;
}

@Injectable()
export class FamilySlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    return normalizeFamilySlug(value);
  }
}
