import { BadRequestException } from '@nestjs/common';

export type DeathAnniversary = {
  day: number;
  month: number;
  display: string;
  key: string;
};

export function normalizeFamilyName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function asciiWords(value: string): string[] {
  const ascii = normalizeFamilyName(value)
    .replace(/[Đđ]/g, (character) => (character === 'Đ' ? 'D' : 'd'))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return ascii.match(/[A-Za-z0-9]+/g) ?? [];
}

function pascalKey(value: string): string {
  return asciiWords(value)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join('');
}

export function familyNameKey(value: string): string {
  const key = pascalKey(value);
  if (!key) throw new BadRequestException('Tên dòng họ phải chứa ít nhất một chữ cái hoặc chữ số.');
  return key;
}

function slugPart(value: string, maxLength: number): string {
  return asciiWords(value)
    .join('-')
    .toLowerCase()
    .slice(0, maxLength)
    .replace(/^-+|-+$/g, '');
}

function originPlace(origin: string): string {
  return origin.split(',')[0] ?? '';
}

export type FamilyLocator = {
  slug: string;
  usernames: { memberPlus: string; member: string };
};

export function familyLocatorCandidates(
  familyName: string,
  anniversary: DeathAnniversary,
  origin: string | null,
): FamilyLocator[] {
  const base = `${slugPart(familyName, 60)}-${anniversary.display.replace('/', '-')}`;
  const candidates: FamilyLocator[] = [
    { slug: base, usernames: generateFamilyUsernames(familyName, anniversary) },
  ];
  const place = origin ? originPlace(origin) : '';
  const placeSlug = slugPart(place, 30);
  if (placeSlug) {
    candidates.push({
      slug: `${base}-${placeSlug}`,
      usernames: generateFamilyUsernames(familyName, anniversary, pascalKey(place)),
    });
  }
  return candidates;
}

export function parseDeathAnniversary(value: string): DeathAnniversary {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) throw new BadRequestException('Ngày giỗ họ phải có định dạng DD/MM.');
  const day = Number(match[1]);
  const month = Number(match[2]);
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]!) {
    throw new BadRequestException('Ngày giỗ họ không phải là ngày và tháng hợp lệ.');
  }
  const dayText = day.toString().padStart(2, '0');
  const monthText = month.toString().padStart(2, '0');
  return { day, month, display: `${dayText}/${monthText}`, key: `${dayText}${monthText}` };
}

export function generateFamilyUsernames(
  familyName: string,
  anniversary: DeathAnniversary,
  originKey = '',
): { memberPlus: string; member: string } {
  const key = `${familyNameKey(familyName)}${anniversary.key}${originKey}`;
  return {
    memberPlus: `TruongHo${key}`,
    member: `ThanhVien${key}`,
  };
}
