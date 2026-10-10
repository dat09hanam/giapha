import type { Person } from '@/types/family-tree';
import { yearOf } from '@/lib/partial-date';

export type PersonSearchEntry = {
  person: Person;
  generation: number;
  lifespan: string;
  fatherName: string | null;
};

export type PersonSearchResult = PersonSearchEntry & {
  matchedAlias: string | null;
};

export function foldVietnamese(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function matchScore(text: string, query: string, foldedQuery: string): number {
  const folded = foldVietnamese(text);
  const words = folded.split(' ');
  const queryWords = foldedQuery.split(' ');
  if (!queryWords.every((queryWord) => words.some((word) => word.startsWith(queryWord)))) return 0;

  let score = 1;
  if (folded === foldedQuery) score += 4;
  else if (folded.startsWith(foldedQuery)) score += 2;
  else if (folded.includes(foldedQuery)) score += 1;
  if (text.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi').trim())) score += 1;
  return score;
}

export function searchPeople(
  entries: PersonSearchEntry[],
  query: string,
  limit: number,
): PersonSearchResult[] {
  const foldedQuery = foldVietnamese(query);
  if (!foldedQuery) return [];

  return entries
    .flatMap((entry): { result: PersonSearchResult; score: number }[] => {
      const nameScore = matchScore(entry.person.name, query, foldedQuery);
      if (nameScore > 0)
        return [{ result: { ...entry, matchedAlias: null }, score: nameScore * 2 }];

      for (const alias of [entry.person.courtesyName, entry.person.nickname]) {
        const aliasScore = alias ? matchScore(alias, query, foldedQuery) : 0;
        if (alias && aliasScore > 0) {
          return [{ result: { ...entry, matchedAlias: alias }, score: aliasScore }];
        }
      }
      return [];
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.result.generation - b.result.generation ||
        a.result.person.name.localeCompare(b.result.person.name, 'vi'),
    )
    .slice(0, limit)
    .map(({ result }) => result);
}

export function searchEntriesFromPeople(people: readonly Person[]): PersonSearchEntry[] {
  const byId = new Map(people.map((person) => [person.id, person]));
  return people.map((person) => {
    const birth = yearOf(person.birthDate)?.toString() ?? null;
    const death = yearOf(person.deathDate)?.toString() ?? null;
    return {
      person,
      generation: person.generation ?? 1,
      lifespan:
        birth || death
          ? `${birth ?? '?'} — ${death ?? (person.isAlive ? 'nay' : '?')}`
          : 'Chưa rõ năm sinh',
      fatherName: person.fatherId ? (byId.get(person.fatherId)?.name ?? null) : null,
    };
  });
}
