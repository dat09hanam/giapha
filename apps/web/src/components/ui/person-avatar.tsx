import Image from 'next/image';

import type { Gender } from '@/types/family-tree';
import { yearOf } from '@/lib/partial-date';

const DEFAULT_AVATAR_BY_GENDER: Record<Gender, string> = {
  MALE: '/images/avatars/default-male.png',
  FEMALE: '/images/avatars/default-female.png',
  OTHER: '/images/avatars/default-neutral.png',
  UNKNOWN: '/images/avatars/default-neutral.png',
};

const ELDER_AVATAR_BY_GENDER: Partial<Record<Gender, string>> = {
  MALE: '/images/avatars/default-elder-male.png',
  FEMALE: '/images/avatars/default-elder-female.png',
};

const ELDER_GENERATION_LIMIT = 3;
const ELDER_AGE = 70;

type PersonAvatarProps = {
  gender: Gender;
  generation?: number | null;
  birthDate?: string | null;
  className?: string;
};

export function shouldUseElderAvatar(
  generation: number | null | undefined,
  birthDate: string | null | undefined,
  currentYear = new Date().getFullYear(),
): boolean {
  if (
    generation === null ||
    generation === undefined ||
    !Number.isInteger(generation) ||
    generation < 1
  ) {
    return false;
  }

  if (generation <= ELDER_GENERATION_LIMIT) return true;
  const bornIn = yearOf(birthDate);
  return bornIn !== null && bornIn <= currentYear && currentYear - bornIn >= ELDER_AGE;
}

export function PersonAvatar({ gender, generation, birthDate, className }: PersonAvatarProps) {
  const elderAvatar = shouldUseElderAvatar(generation, birthDate)
    ? ELDER_AVATAR_BY_GENDER[gender]
    : undefined;

  return (
    <Image
      src={elderAvatar ?? DEFAULT_AVATAR_BY_GENDER[gender]}
      alt=""
      width={512}
      height={512}
      className={className}
      aria-hidden="true"
      draggable={false}
    />
  );
}
