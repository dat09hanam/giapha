import { SetMetadata } from '@nestjs/common';

export const ALLOW_PENDING_PASSWORD_CHANGE_KEY = 'allow_pending_password_change';

/**
 * Lets an account that must still replace its given password reach this route; every other
 * signed-in route refuses it until the password is changed.
 */
export const AllowPendingPasswordChange = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_PENDING_PASSWORD_CHANGE_KEY, true);
