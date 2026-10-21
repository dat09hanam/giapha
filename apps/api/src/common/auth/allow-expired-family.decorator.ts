import { SetMetadata } from '@nestjs/common';

export const ALLOW_EXPIRED_FAMILY_KEY = 'allow_expired_family';

/** Lets a family whose plan ran out still reach this route, e.g. to see and renew its plan. */
export const AllowExpiredFamily = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_EXPIRED_FAMILY_KEY, true);
