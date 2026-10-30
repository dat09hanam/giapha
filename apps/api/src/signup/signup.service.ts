import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';

import { AdminNotifyService } from '../admin-notify/admin-notify.service.js';
import { AuthService, type AuthResult } from '../auth/auth.service.js';
import type { GoogleIdentity } from '../auth/google-id-token.js';
import { PrismaService } from '../database/prisma.service.js';
import { FamiliesService } from '../families/families.service.js';
import type { GoogleSignupDto } from './dto/google-signup.dto.js';

export type GoogleSignupResult = AuthResult & {
  /** The family's shared member account, shown once so the clan head can pass it on. */
  member: { username: string; password: string };
};

@Injectable()
export class SignupService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FamiliesService) private readonly families: FamiliesService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AdminNotifyService) private readonly notifier: AdminNotifyService,
  ) {}

  /**
   * Opens a family on the plan the admin marked for Google sign-up, with the Google account as
   * its clan head, and signs them in.
   */
  async registerWithGoogle(
    identity: GoogleIdentity,
    input: GoogleSignupDto,
  ): Promise<GoogleSignupResult> {
    if (!input.agreed) {
      throw new BadRequestException('Bạn cần đồng ý với quy định sử dụng để đăng ký.');
    }
    const existing = await this.prisma.user.count({
      where: { OR: [{ googleSub: identity.sub }, { email: identity.email }] },
    });
    if (existing) {
      throw new ConflictException(
        'Tài khoản Google này đã có tài khoản Gia Phả. Hãy đăng nhập bằng Google.',
      );
    }

    const plan = await this.prisma.pricingPlan.findFirst({
      where: { googleSignup: true },
      select: { id: true },
    });
    if (!plan) throw new BadRequestException('Đăng ký bằng Google hiện đang tạm đóng.');

    const created = await this.families.createFamily(
      {
        name: input.name,
        deathAnniversary: input.deathAnniversary,
        ancestryOrigin: input.ancestryOrigin,
        headEmail: identity.email,
        headName: identity.name ?? undefined,
        headPhone: input.headPhone,
        planId: plan.id,
        ambassadorCode: input.ambassadorCode,
      },
      identity.sub,
    );
    const head = await this.prisma.user.findUniqueOrThrow({
      where: { googleSub: identity.sub },
      select: { id: true },
    });
    this.notifier.notify({
      kind: 'GOOGLE_SIGNUP',
      familyName: created.family.name,
      slug: created.family.slug,
      email: identity.email,
      planName: created.family.plan.name,
    });
    const session = await this.auth.startSession(head.id);
    const member = created.accounts?.member;
    if (!member) throw new Error('A new family always has a shared member account.');
    return { ...session, member: { username: member.username, password: member.password } };
  }
}
