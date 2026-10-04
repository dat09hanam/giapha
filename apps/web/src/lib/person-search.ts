import type { Person } from '@/types/family-tree';

export type PersonSearchEntry = {
  person: Person;
  generation: number;
  lifespan: string;
  fatherName: string | null;
};

export type PersonSearchResult = PersonSearchEntry & {
  /** The alias that matched when the name itself did not, e.g. a courtesy name. */
  matchedAlias: string | null;
};

/** Lower-cased, without Vietnamese tone marks and with đ → d, so "nguyen van an" finds "Nguyễn Văn An". */
export function foldVietnamese(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * How well `query` matches `text`, or 0 for no match. Every query word must
 * start a word of the text; a whole-text match, a match from the first word,
 * and one typed with the same tone marks rank higher.
 */
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
      // A name match outranks any alias match of the same quality.
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

/** Search entries straight from the tree's people, for pickers outside the tree view. */
export function searchEntriesFromPeople(people: readonly Person[]): PersonSearchEntry[] {
  const byId = new Map(people.map((person) => [person.id, person]));
  const year = (value: string | null): string | null => value?.slice(0, 4) ?? null;
  return people.map((person) => {
    const birth = year(person.birthDate);
    const death = year(person.deathDate);
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
