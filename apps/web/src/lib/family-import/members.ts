import { GENDER_LABELS, WIFE_FIELDS } from '@/lib/family-import/columns';
import type { SheetPerson } from '@/lib/family-import/template';
import type { FamilyTreeResponse, Person } from '@/types/family-tree';

function byLineage(left: Person, right: Person): number {
  return (
    (left.generation ?? Number.MAX_SAFE_INTEGER) - (right.generation ?? Number.MAX_SAFE_INTEGER) ||
    (left.orderInFamily ?? Number.MAX_SAFE_INTEGER) -
      (right.orderInFamily ?? Number.MAX_SAFE_INTEGER) ||
    left.name.localeCompare(right.name, 'vi')
  );
}

/**
 * The stored tree as sheet rows, coded 1…n: by generation and birth order, each wife right after
 * her husband. A wife sits in the Vợ column of her wife order when it is free, else the first free
 * one; wives past the last column are left out, since the rows only anchor codes for new people.
 */
export function treeToSheetPeople(tree: FamilyTreeResponse): SheetPerson[] {
  const wivesOf = new Map<string, Array<{ wifeId: string; order: number | null }>>();
  for (const relationship of tree.relationships) {
    const wives = wivesOf.get(relationship.husbandId) ?? [];
    wives.push({ wifeId: relationship.wifeId, order: relationship.wifeOrder });
    wivesOf.set(relationship.husbandId, wives);
  }

  const ordered: Person[] = [];
  const placed = new Set<string>();
  const byId = new Map(tree.people.map((person) => [person.id, person]));
  const place = (person: Person | undefined): void => {
    if (!person || placed.has(person.id)) return;
    placed.add(person.id);
    ordered.push(person);
  };
  const wifeIds = new Set(tree.relationships.map((relationship) => relationship.wifeId));
  const sorted = [...tree.people].sort(byLineage);
  // Husbands and unmarried people lead; a wife is placed with her husband, or at the end.
  for (const person of [...sorted.filter((person) => !wifeIds.has(person.id)), ...sorted]) {
    place(person);
    const wives = [...(wivesOf.get(person.id) ?? [])].sort(
      (left, right) =>
        (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER),
    );
    for (const wife of wives) place(byId.get(wife.wifeId));
  }

  const codeOf = new Map(ordered.map((person, index) => [person.id, String(index + 1)]));
  return ordered.map((person) => {
    const row: SheetPerson = {
      code: codeOf.get(person.id),
      name: person.name,
      gender: GENDER_LABELS[person.gender],
      honorific: person.honorific ?? '',
      nickname: person.nickname ?? '',
      courtesyName: person.courtesyName ?? '',
      fatherCode: (person.fatherId && codeOf.get(person.fatherId)) || '',
      motherCode: (person.motherId && codeOf.get(person.motherId)) || '',
      generation: person.generation?.toString() ?? '',
      orderInFamily: person.orderInFamily?.toString() ?? '',
      birthDate: person.birthDate ?? '',
      isAlive: person.isAlive ? 'Có' : 'Không',
      deathDate: person.deathDate ?? '',
      lunarDeath:
        person.lunarDeathDay && person.lunarDeathMonth
          ? `${person.lunarDeathDay}/${person.lunarDeathMonth}`
          : '',
      ageAtDeath: person.ageAtDeath?.toString() ?? '',
      burialPlace: person.burialPlace ?? '',
      worshipPlace: person.worshipPlace ?? '',
      phone: person.phone ?? '',
      education: person.education ?? '',
      occupation: person.occupation ?? '',
      hometown: person.hometown ?? '',
      currentAddress: person.currentAddress ?? '',
      biography: person.biography ?? '',
      personId: person.id,
    };

    const slots: Array<string | undefined> = WIFE_FIELDS.map(() => undefined);
    const wives = wivesOf.get(person.id) ?? [];
    const unplaced: string[] = [];
    for (const wife of wives) {
      const code = codeOf.get(wife.wifeId);
      if (!code) continue;
      const slot = wife.order !== null ? wife.order - 1 : -1;
      if (slot >= 0 && slot < slots.length && slots[slot] === undefined) slots[slot] = code;
      else unplaced.push(code);
    }
    for (const code of unplaced) {
      const free = slots.indexOf(undefined);
      if (free === -1) break;
      slots[free] = code;
    }
    WIFE_FIELDS.forEach((field, index) => {
      row[field] = slots[index] ?? '';
    });
    return row;
  });
}
