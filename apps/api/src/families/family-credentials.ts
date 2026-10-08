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

/** Accent-free kebab-case capped at `maxLength`: "Họ Nguyễn" → "ho-nguyen". */
function slugPart(value: string, maxLength: number): string {
  return asciiWords(value)
    .join('-')
    .toLowerCase()
    .slice(0, maxLength)
    .replace(/^-+|-+$/g, '');
}

/**
 * The most specific place of an origin such as "Thanh Lộc, Can Lộc, Hà Tĩnh" (its first
 * comma-separated part), so a disambiguated path stays short.
 */
function originPlace(origin: string): string {
  return origin.split(',')[0] ?? '';
}

export type FamilyLocator = {
  slug: string;
  usernames: { memberPlus: string; member: string };
};

/**
 * The Family's path and initial usernames, in order of preference: name and death anniversary
 * ("ho-nguyen-15-03"), then with the origin's place appended ("ho-nguyen-15-03-thanh-loc").
 * Each part is capped so the slug stays within its 100-character column.
 */
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
