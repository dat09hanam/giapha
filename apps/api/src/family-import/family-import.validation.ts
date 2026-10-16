import { Gender } from '@prisma/client';

import { yearOf } from '../family-tree/person-dates.js';
import type {
  ImportFamilyTreeDto,
  ImportPersonDto,
  ImportRelationshipDto,
} from './dto/import-family-tree.dto.js';
import type { ImportIssue } from './family-import.types.js';

/** People in insertion order: each layer only has parents in earlier layers. */
export type ImportPlan = {
  layers: ImportPersonDto[][];
  generationByCode: Map<string, number>;
};

export type ImportCheck = { issues: ImportIssue[]; plan: ImportPlan | null };

/** Spreadsheet codes compare without surrounding spaces or letter case. */
export function codeKey(code: string): string {
  return code.trim().toLocaleUpperCase('vi');
}

function optionalCodeKey(code: string | null | undefined): string | null {
  const trimmed = code?.trim();
  return trimmed ? codeKey(trimmed) : null;
}

function nameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
}

function checkPeople(
  people: ImportPersonDto[],
  issues: ImportIssue[],
): Map<string, ImportPersonDto> {
  const byCode = new Map<string, ImportPersonDto>();
  const flag = (person: ImportPersonDto, message: string): void => {
    issues.push({ sheet: 'people', row: person.row, message });
  };

  for (const person of people) {
    const key = codeKey(person.code);
    if (!key) {
      flag(person, 'Mã thành viên không được để trống.');
      continue;
    }
    const earlier = byCode.get(key);
    if (earlier) {
      flag(person, `Mã “${person.code.trim()}” bị trùng với dòng ${earlier.row}.`);
      continue;
    }
    byCode.set(key, person);
    if (!person.name.trim()) flag(person, 'Họ và tên không được để trống.');
    const bornIn = yearOf(person.birthDate);
    const diedIn = yearOf(person.deathDate);
    if (bornIn !== null && diedIn !== null && diedIn < bornIn) {
      flag(person, 'Năm mất không được trước năm sinh.');
    }
    if ((person.lunarDeathDay == null) !== (person.lunarDeathMonth == null)) {
      flag(person, 'Ngày giỗ âm lịch cần đủ cả ngày và tháng (dd/mm).');
    }
  }

  for (const person of byCode.values()) {
    const ownKey = codeKey(person.code);
    const fatherKey = optionalCodeKey(person.fatherCode);
    const motherKey = optionalCodeKey(person.motherCode);
    for (const [parentKey, label, gender] of [
      [fatherKey, 'cha', Gender.MALE],
      [motherKey, 'mẹ', Gender.FEMALE],
    ] as const) {
      if (!parentKey) continue;
      const parent = byCode.get(parentKey);
      if (!parent) {
        flag(person, `Mã ${label} “${parentKey}” không có trong sheet thành viên.`);
      } else if (parentKey === ownKey) {
        flag(person, `Một thành viên không thể là ${label} của chính mình.`);
      } else if (parent.gender !== gender) {
        flag(
          person,
          `Người ${label} (dòng ${parent.row}) phải có giới tính ${gender === Gender.MALE ? 'Nam' : 'Nữ'}.`,
        );
      }
    }
    if (fatherKey && fatherKey === motherKey) {
      flag(person, 'Cha và mẹ phải là hai người khác nhau.');
    }
  }
  return byCode;
}

function checkRelationships(
  relationships: ImportRelationshipDto[],
  byCode: Map<string, ImportPersonDto>,
  issues: ImportIssue[],
): Set<string> {
  const couples = new Set<string>();
  for (const relationship of relationships) {
    const flag = (message: string): void => {
      issues.push({ sheet: 'relationships', row: relationship.row, message });
    };
    const husbandKey = codeKey(relationship.husbandCode);
    const wifeKey = codeKey(relationship.wifeCode);
    const husband = byCode.get(husbandKey);
    const wife = byCode.get(wifeKey);
    if (!husband) flag(`Mã chồng “${husbandKey}” không có trong sheet thành viên.`);
    if (!wife) flag(`Mã vợ “${wifeKey}” không có trong sheet thành viên.`);
    if (!husband || !wife) continue;
    if (husbandKey === wifeKey) {
      flag('Một thành viên không thể kết hôn với chính mình.');
      continue;
    }
    if (husband.gender !== Gender.MALE || wife.gender !== Gender.FEMALE) {
      flag('Người chồng phải là Nam và người vợ phải là Nữ.');
      continue;
    }
    const key = husbandKey + '|' + wifeKey;
    if (couples.has(key)) {
      flag('Cặp vợ chồng này bị khai báo trùng.');
      continue;
    }
    couples.add(key);
  }
  return couples;
}

/** Same rule as the tree designer, so an imported tree can later be saved there unchanged. */
function checkNamesakeSiblings(
  byCode: Map<string, ImportPersonDto>,
  couples: Set<string>,
  issues: ImportIssue[],
): void {
  const isCouple = (left: string, right: string): boolean =>
    couples.has(left + '|' + right) || couples.has(right + '|' + left);
  const namesakes = new Map<string, ImportPersonDto[]>();
  for (const [key, person] of byCode) {
    const fatherKey = optionalCodeKey(person.fatherCode);
    const motherKey = optionalCodeKey(person.motherCode);
    if (!fatherKey && !motherKey) continue;
    const siblingKey = [nameKey(person.name), fatherKey ?? '', motherKey ?? ''].join('|');
    const earlier = namesakes.get(siblingKey) ?? [];
    const clash = earlier.find((other) => !isCouple(codeKey(other.code), key));
    if (clash) {
      issues.push({
        sheet: 'people',
        row: person.row,
        message: `Trùng họ tên với anh/chị/em ruột ở dòng ${clash.row}.`,
      });
    }
    namesakes.set(siblingKey, [...earlier, person]);
  }
}

/** Kahn's algorithm over in-sheet parents; whatever cannot be layered sits on a cycle. */
function layerByAncestry(
  byCode: Map<string, ImportPersonDto>,
  issues: ImportIssue[],
): ImportPersonDto[][] | null {
  // Self-references are already reported by checkPeople; keep them out of the cycle report.
  const parentsOf = (person: ImportPersonDto): string[] =>
    [optionalCodeKey(person.fatherCode), optionalCodeKey(person.motherCode)].filter(
      (key): key is string => key !== null && byCode.has(key) && key !== codeKey(person.code),
    );
  const pending = new Map<string, number>();
  const childrenOf = new Map<string, string[]>();
  for (const [key, person] of byCode) {
    const parents = parentsOf(person);
    pending.set(key, parents.length);
    for (const parent of parents) childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), key]);
  }

  const layers: ImportPersonDto[][] = [];
  let current = [...pending].filter(([, count]) => count === 0).map(([key]) => key);
  let placed = 0;
  while (current.length > 0) {
    layers.push(current.map((key) => byCode.get(key)!));
    placed += current.length;
    const next: string[] = [];
    for (const key of current) {
      for (const child of childrenOf.get(key) ?? []) {
        const left = pending.get(child)! - 1;
        pending.set(child, left);
        if (left === 0) next.push(child);
      }
    }
    current = next;
  }
  if (placed === byCode.size) return layers;

  // Descendants of a cycle are stuck too; peel them off so only the cycle itself is reported.
  const stuck = new Set([...pending].filter(([, count]) => count > 0).map(([key]) => key));
  let peeled = true;
  while (peeled) {
    peeled = false;
    for (const key of stuck) {
      if (!(childrenOf.get(key) ?? []).some((child) => stuck.has(child))) {
        stuck.delete(key);
        peeled = true;
      }
    }
  }
  for (const key of stuck) {
    issues.push({
      sheet: 'people',
      row: byCode.get(key)!.row,
      message: 'Quan hệ cha mẹ tạo thành vòng lặp (một người là tổ tiên của chính mình).',
    });
  }
  return null;
}

/**
 * Fills missing generations: a child is one below its father (else mother), someone married in
 * takes their spouse's generation, and any other root starts at 1. Given values always win.
 */
function deriveGenerations(layers: ImportPersonDto[][], couples: Set<string>): Map<string, number> {
  const generation = new Map<string, number>();
  const spouses = new Map<string, string[]>();
  for (const couple of couples) {
    const [husband, wife] = couple.split('|') as [string, string];
    spouses.set(husband, [...(spouses.get(husband) ?? []), wife]);
    spouses.set(wife, [...(spouses.get(wife) ?? []), husband]);
  }
  const roots = new Set(layers[0]?.map((person) => codeKey(person.code)));
  const marriedIn = (key: string): boolean =>
    (spouses.get(key) ?? []).some((spouse) => !roots.has(spouse));

  const fromParents = (person: ImportPersonDto): number | undefined => {
    for (const parent of [person.fatherCode, person.motherCode]) {
      const known = generation.get(optionalCodeKey(parent) ?? '');
      if (known !== undefined) return known + 1;
    }
    return undefined;
  };
  const pass = (): void => {
    for (const layer of layers) {
      for (const person of layer) {
        const key = codeKey(person.code);
        if (generation.has(key)) continue;
        const value =
          person.generation ??
          (roots.has(key) ? (marriedIn(key) ? undefined : 1) : fromParents(person));
        if (value !== undefined) generation.set(key, value);
      }
    }
  };

  pass();
  for (const key of roots) {
    if (generation.has(key)) continue;
    const spouseGeneration = (spouses.get(key) ?? [])
      .map((spouse) => generation.get(spouse))
      .find((value) => value !== undefined);
    generation.set(key, spouseGeneration ?? 1);
  }
  pass();
  return generation;
}

/** Checks an import file without touching the database. A plan is returned only when clean. */
export function checkImport(input: ImportFamilyTreeDto): ImportCheck {
  const issues: ImportIssue[] = [];
  const byCode = checkPeople(input.people, issues);
  const couples = checkRelationships(input.relationships, byCode, issues);
  checkNamesakeSiblings(byCode, couples, issues);
  const layers = layerByAncestry(byCode, issues);
  issues.sort(
    (left, right) => left.sheet.localeCompare(right.sheet) || (left.row ?? 0) - (right.row ?? 0),
  );
  if (issues.length > 0 || !layers) return { issues, plan: null };
  return { issues, plan: { layers, generationByCode: deriveGenerations(layers, couples) } };
}
