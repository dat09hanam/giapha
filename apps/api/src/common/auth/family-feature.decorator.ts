import { SetMetadata } from '@nestjs/common';

import type { FamilyFeature } from '../family-features.js';

export const FAMILY_FEATURE_KEY = 'family_feature';

export const RequiresFamilyFeature = (feature: FamilyFeature): MethodDecorator & ClassDecorator =>
  SetMetadata(FAMILY_FEATURE_KEY, feature);
