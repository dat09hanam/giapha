import { Inject, Injectable } from '@nestjs/common';

import {
  FAMILY_FEATURES,
  readFamilyFeatures,
  type FamilyFeatures,
} from '../common/family-features.js';
import { PrismaService } from '../database/prisma.service.js';
import type { UpdatePlatformFeaturesDto } from './platform-features.dto.js';

@Injectable()
export class PlatformFeaturesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getFeatures(): Promise<FamilyFeatures> {
    return readFamilyFeatures(this.prisma);
  }

  async updateFeatures(input: UpdatePlatformFeaturesDto): Promise<FamilyFeatures> {
    const changes = FAMILY_FEATURES.flatMap((feature) => {
      const enabled = input[feature];
      return enabled === undefined ? [] : [{ key: feature, enabled }];
    });
    await this.prisma.$transaction(
      changes.map(({ key, enabled }) =>
        this.prisma.platformFeature.upsert({
          where: { key },
          create: { key, enabled },
          update: { enabled },
        }),
      ),
    );
    return this.getFeatures();
  }
}
