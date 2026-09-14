import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable()
export class TenantSlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const slug = value.trim().toLowerCase();

    if (slug.length < 2 || slug.length > 100 || !TENANT_SLUG_PATTERN.test(slug)) {
      throw new BadRequestException('Tenant slug is invalid');
    }

    return slug;
  }
}
