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

export function familyNameKey(value: string): string {
  const ascii = normalizeFamilyName(value)
    .replace(/[Đđ]/g, (character) => (character === 'Đ' ? 'D' : 'd'))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const parts = ascii.match(/[A-Za-z0-9]+/g) ?? [];
  const key = parts
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join('');
  if (!key) throw new BadRequestException('Family name must contain letters or numbers');
  return key;
}

export function parseDeathAnniversary(value: string): DeathAnniversary {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) throw new BadRequestException('Death anniversary must use DD/MM');
  const day = Number(match[1]);
  const month = Number(match[2]);
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]!) {
    throw new BadRequestException('Death anniversary is not a valid day and month');
  }
  const dayText = day.toString().padStart(2, '0');
  const monthText = month.toString().padStart(2, '0');
  return { day, month, display: `${dayText}/${monthText}`, key: `${dayText}${monthText}` };
}

export function generateFamilyUsernames(
  familyName: string,
  anniversary: DeathAnniversary,
): { memberPlus: string; member: string } {
  const key = familyNameKey(familyName);
  return {
    memberPlus: `TruongHo${key}${anniversary.key}`,
    member: `ThanhVien${key}${anniversary.key}`,
  };
}
