import { Module } from '@nestjs/common';

import { AuthThrottleGuard } from '../common/auth/auth-throttle.guard.js';
import { PlatformAdminGuard } from '../common/auth/platform-admin.guard.js';
import { SessionAuthGuard } from '../common/auth/session-auth.guard.js';
import { FamilyAccessGuard } from '../common/auth/family-access.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { FamilyInvitationsController } from './family-invitations.controller.js';

@Module({
  controllers: [AuthController, FamilyInvitationsController],
  providers: [
    AuthService,
    AuthThrottleGuard,
    SessionAuthGuard,
    FamilyAccessGuard,
    PlatformAdminGuard,
  ],
  exports: [AuthService, SessionAuthGuard, FamilyAccessGuard, PlatformAdminGuard],
})
export class AuthModule {}
