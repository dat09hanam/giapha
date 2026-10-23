import { Gender } from '@prisma/client';

import { yearOf } from '../family-tree/person-dates.js';
import type {
  ImportFamilyTreeDto,
  ImportPersonDto,
  ImportRelationshipDto,
} from './dto/import-family-tree.dto.js';
import type { ImportIssue } from './family-import.types.js';

/** The tree as stored, loaded by the service for the family the request is scoped to. */
export type ExistingPerson = {
  id: string;
  name: string;
  gender: Gender;
  generation: number | null;
  fatherId: string | null;
  motherId: string | null;
  orderInFamily: number | null;
  birthDate: string | null;
  deathDate: string | null;
};

export type ExistingTree = {
  people: Map<string, ExistingPerson>;
  /** `husbandId|wifeId` for every stored couple. */
  couples: Set<string>;
  /** Wife orders already taken, per husband id. */
  wifeOrders: Map<string, Set<number>>;
};

export const EMPTY_TREE: ExistingTree = {
  people: new Map(),
  couples: new Set(),
  wifeOrders: new Map(),
};

/** People in insertion order: each layer only has parents in earlier layers or the stored tree. */
export type ImportPlan = {
  layers: ImportPersonDto[][];
  generationByCode: Map<string, number>;
  /** Birth order among the father's (else mother's) children; blanks numbered after the rest. */
  orderByCode: Map<string, number>;
  /** Stored people by their code in the file, so new rows can point at them. */
  existingIdByCode: Map<string, string>;
  /** Couples to create; ones already in the tree are left out. */
  relationships: ImportRelationshipDto[];
};

export type ImportCheck = {
  issues: ImportIssue[];
  plan: ImportPlan | null;
  relationshipCount: number;
};

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

/** Someone a row can point at: a new row of the file, or a stored person listed in it. */
type Member =
  | { kind: 'new'; person: ImportPersonDto }
  | { kind: 'existing'; person: ExistingPerson; row: number };

function memberGender(member: Member): Gender {
  return member.person.gender;
}

function memberRow(member: Member): number {
  return member.kind === 'new' ? member.person.row : member.row;
}

/** Maps listed codes to stored people of this family; unknown ids are reported, never trusted. */
function anchorExisting(
  input: ImportFamilyTreeDto,
  tree: ExistingTree,
  issues: ImportIssue[],
): Map<string, Member> {
  const members = new Map<string, Member>();
  for (const listed of input.existingPeople ?? []) {
    const flag = (message: string): void => {
      issues.push({ sheet: 'people', row: listed.row, message });
    };
    const key = codeKey(listed.code);
    const person = tree.people.get(listed.personId);
    if (!person) {
      flag('Thành viên này không còn trong cây (có thể vừa bị xóa). Hãy tải lại file mới.');
      continue;
    }
    const earlier = members.get(key);
    if (earlier) {
      flag(`Mã “${listed.code.trim()}” bị trùng với dòng ${memberRow(earlier)}.`);
      continue;
    }
    members.set(key, { kind: 'existing', person, row: listed.row });
  }
  return members;
}

function checkPeople(
  people: ImportPersonDto[],
  members: Map<string, Member>,
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
    const earlier = members.get(key);
    if (earlier) {
      const owner = earlier.kind === 'existing' ? 'thành viên đã có ở dòng' : 'dòng';
      flag(person, `Mã “${person.code.trim()}” bị trùng với ${owner} ${memberRow(earlier)}.`);
      continue;
    }
    byCode.set(key, person);
    members.set(key, { kind: 'new', person });
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
      const parent = members.get(parentKey);
      if (!parent) {
        flag(person, `Mã ${label} “${parentKey}” không có trong sheet thành viên.`);
      } else if (parentKey === ownKey) {
        flag(person, `Một thành viên không thể là ${label} của chính mình.`);
      } else if (memberGender(parent) !== gender) {
        flag(
          person,
          `Người ${label} (dòng ${memberRow(parent)}) phải có giới tính ${gender === Gender.MALE ? 'Nam' : 'Nữ'}.`,
        );
      }
    }
    if (fatherKey && fatherKey === motherKey) {
      flag(person, 'Cha và mẹ phải là hai người khác nhau.');
    }
  }
  return byCode;
}

/**
 * Keeps the couples to create, keyed `husbandCode|wifeCode`. A couple of two stored people that
 * the tree already has is the downloaded list repeating itself, so it is skipped, not reported.
 */
function checkRelationships(
  relationships: ImportRelationshipDto[],
  members: Map<string, Member>,
  tree: ExistingTree,
  issues: ImportIssue[],
): Map<string, ImportRelationshipDto> {
  const couples = new Map<string, ImportRelationshipDto>();
  for (const relationship of relationships) {
    const flag = (message: string): void => {
      issues.push({ sheet: 'relationships', row: relationship.row, message });
    };
    const husbandKey = codeKey(relationship.husbandCode);
    const wifeKey = codeKey(relationship.wifeCode);
    const husband = members.get(husbandKey);
    const wife = members.get(wifeKey);
    if (!husband) flag(`Mã chồng “${husbandKey}” không có trong sheet thành viên.`);
    if (!wife) flag(`Mã vợ “${wifeKey}” không có trong sheet thành viên.`);
    if (!husband || !wife) continue;
    if (husbandKey === wifeKey) {
      flag('Một thành viên không thể kết hôn với chính mình.');
      continue;
    }
    if (memberGender(husband) !== Gender.MALE || memberGender(wife) !== Gender.FEMALE) {
      flag('Người chồng phải là Nam và người vợ phải là Nữ.');
      continue;
    }
    if (husband.kind === 'existing' && wife.kind === 'existing') {
      if (tree.couples.has(husband.person.id + '|' + wife.person.id)) continue;
    }
    const wifeHasParents =
      wife.kind === 'new'
        ? Boolean(
            optionalCodeKey(wife.person.fatherCode) ?? optionalCodeKey(wife.person.motherCode),
          )
        : Boolean(wife.person.fatherId ?? wife.person.motherId);
    if (wifeHasParents) {
      flag(
        `${wife.person.name} đã có cha/mẹ trong gia phả (con trong họ) nên không thể là vợ; vợ là người từ ngoài về làm dâu.`,
      );
      continue;
    }
    if (husband.kind === 'existing' && relationship.wifeOrder != null) {
      if (tree.wifeOrders.get(husband.person.id)?.has(relationship.wifeOrder)) {
        flag(
          `${husband.person.name} đã có Vợ ${relationship.wifeOrder} trong cây; hãy chọn ở cột Vợ còn trống.`,
        );
        continue;
      }
    }
    const key = husbandKey + '|' + wifeKey;
    if (couples.has(key)) {
      flag('Cặp vợ chồng này bị khai báo trùng.');
      continue;
    }
    couples.set(key, relationship);
  }

  // Wife orders of each husband, stored and new together, must run 1, 2, 3… without a gap.
  const ordersOf = new Map<string, { orders: Set<number>; rows: ImportRelationshipDto[] }>();
  for (const [key, relationship] of couples) {
    const husbandKey = key.split('|')[0]!;
    const husband = members.get(husbandKey)!;
    const entry = ordersOf.get(husbandKey) ?? {
      orders: new Set(husband.kind === 'existing' ? tree.wifeOrders.get(husband.person.id) : []),
      rows: [],
    };
    if (relationship.wifeOrder != null) entry.orders.add(relationship.wifeOrder);
    entry.rows.push(relationship);
    ordersOf.set(husbandKey, entry);
  }
  for (const [husbandKey, { orders, rows }] of ordersOf) {
    const missing = missingNumbers(orders);
    if (missing.length === 0) continue;
    issues.push({
      sheet: 'relationships',
      row: rows[0]!.row,
      message: `Vợ thứ bị nhảy cóc: ${members.get(husbandKey)!.person.name} có ${[...orders]
        .sort((a, b) => a - b)
        .map((order) => 'Vợ ' + order)
        .join(', ')} nhưng thiếu ${missing.map((order) => 'Vợ ' + order).join(', ')}.`,
    });
  }
  return couples;
}

/** Numbers missing from 1 up to the largest one present. */
function missingNumbers(numbers: Iterable<number>): number[] {
  const present = new Set(numbers);
  const largest = Math.max(0, ...present);
  const missing: number[] = [];
  for (let value = 1; value <= largest; value += 1) if (!present.has(value)) missing.push(value);
  return missing;
}

/**
 * Same rule as the tree designer, so an imported tree can later be saved there unchanged. Stored
 * siblings count too; only new rows are reported.
 */
function checkNamesakeSiblings(
  byCode: Map<string, ImportPersonDto>,
  members: Map<string, Member>,
  couples: Map<string, ImportRelationshipDto>,
  tree: ExistingTree,
  issues: ImportIssue[],
): void {
  const isCouple = (left: string, right: string): boolean =>
    couples.has(left + '|' + right) || couples.has(right + '|' + left);
  // A parent is told apart by stored id, or by code while it is only a row of the file.
  const parentIdentity = (code: string | null | undefined): string => {
    const key = optionalCodeKey(code);
    if (!key) return '';
    const member = members.get(key);
    return member?.kind === 'existing' ? 'id:' + member.person.id : 'code:' + key;
  };
  const storedSiblings = new Map<string, string>();
  for (const person of tree.people.values()) {
    if (!person.fatherId && !person.motherId) continue;
    const father = person.fatherId ? 'id:' + person.fatherId : '';
    const mother = person.motherId ? 'id:' + person.motherId : '';
    storedSiblings.set([nameKey(person.name), father, mother].join('|'), person.name);
  }

  const namesakes = new Map<string, ImportPersonDto[]>();
  for (const [key, person] of byCode) {
    const father = parentIdentity(person.fatherCode);
    const mother = parentIdentity(person.motherCode);
    if (!father && !mother) continue;
    const siblingKey = [nameKey(person.name), father, mother].join('|');
    if (storedSiblings.has(siblingKey)) {
      issues.push({
        sheet: 'people',
        row: person.row,
        message: `Trùng họ tên với anh/chị/em ruột đã có trong cây (${storedSiblings.get(siblingKey)}).`,
      });
      continue;
    }
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

/** Facts about anyone a row can point at, whether a new row or a stored person. */
function lineageOf(member: Member): {
  name: string;
  row: number | null;
  bornIn: number | null;
  diedIn: number | null;
} {
  return member.kind === 'new'
    ? {
        name: member.person.name,
        row: member.person.row,
        bornIn: yearOf(member.person.birthDate),
        diedIn: yearOf(member.person.deathDate),
      }
    : {
        name: member.person.name,
        row: null,
        bornIn: yearOf(member.person.birthDate),
        diedIn: yearOf(member.person.deathDate),
      };
}

function describe(member: Member): string {
  const { name, row } = lineageOf(member);
  return row === null ? `${name} (đã có trong cây)` : `${name} (dòng ${row})`;
}

/**
 * Generations follow the tree designer: a child is one below its father (else mother), a wife takes
 * her husband's generation, and only a founding ancestor at generation 1 may have no parents. A
 * given value must agree; leaving it blank lets the system fill it in.
 */
function checkGenerations(
  layers: ImportPersonDto[][],
  members: Map<string, Member>,
  couples: Map<string, ImportRelationshipDto>,
  issues: ImportIssue[],
): Map<string, number> {
  const generation = new Map<string, number>();
  for (const [key, member] of members) {
    if (member.kind === 'existing' && member.person.generation !== null) {
      generation.set(key, member.person.generation);
    }
  }
  const husbandsOf = new Map<string, string[]>();
  for (const couple of couples.keys()) {
    const [husband, wife] = couple.split('|') as [string, string];
    husbandsOf.set(wife, [...(husbandsOf.get(wife) ?? []), husband]);
  }
  const people = layers.flat();
  const flag = (person: ImportPersonDto, message: string): void => {
    issues.push({ sheet: 'people', row: person.row, message });
  };

  /** The generation a row must have, once whoever it depends on is known; `undefined` waits. */
  const expected = (person: ImportPersonDto): number | null | undefined => {
    for (const code of [person.fatherCode, person.motherCode]) {
      const key = optionalCodeKey(code);
      if (!key) continue;
      const parent = generation.get(key);
      if (parent !== undefined) return parent + 1;
      const member = members.get(key);
      // A stored parent without a generation cannot place the child; the given value stands.
      if (member?.kind === 'existing') return null;
      return undefined;
    }
    const husbands = husbandsOf.get(codeKey(person.code));
    if (husbands?.length) {
      const husband = generation.get(husbands[0]!);
      return husband ?? undefined;
    }
    return null;
  };

  const settled = new Set<string>();
  let progress = true;
  while (progress) {
    progress = false;
    for (const person of people) {
      const key = codeKey(person.code);
      if (settled.has(key)) continue;
      const value = expected(person);
      if (value === undefined) continue;
      settled.add(key);
      progress = true;
      const hasParents = Boolean(
        optionalCodeKey(person.fatherCode) ?? optionalCodeKey(person.motherCode),
      );
      const isWife = (husbandsOf.get(key)?.length ?? 0) > 0;
      if (value === null) {
        if (!hasParents && !isWife && person.generation !== 1) {
          flag(
            person,
            person.generation == null
              ? 'Chưa chọn Mã cha hoặc Mã mẹ. Chỉ thủy tổ mới không có cha mẹ; nếu đây là thủy tổ, hãy điền Đời thứ = 1.'
              : `Đời thứ ${person.generation} nhưng chưa chọn Mã cha hoặc Mã mẹ. Chỉ người ở đời 1 mới không cần cha mẹ.`,
          );
        }
        generation.set(key, person.generation ?? 1);
        continue;
      }
      if (person.generation != null && person.generation !== value) {
        flag(
          person,
          hasParents
            ? `Đời thứ ${person.generation} không khớp: cha/mẹ ở đời ${value - 1} nên người này ở đời ${value}. Bỏ trống cột Đời thứ để hệ thống tự tính.`
            : `Đời thứ ${person.generation} không khớp: người vợ cùng đời với chồng (đời ${value}). Bỏ trống cột Đời thứ để hệ thống tự tính.`,
        );
      }
      generation.set(key, value);
    }
  }
  // Only rows pointing at an unknown code stay unsettled, and those are already reported.
  for (const person of people) {
    const key = codeKey(person.code);
    if (!generation.has(key)) generation.set(key, person.generation ?? 1);
  }
  return generation;
}

/**
 * Children are numbered among all of their father's children, across every wife (the mother's
 * when there is no father), as the tree designer does. Given numbers may not repeat or skip one;
 * blank ones continue after the largest.
 */
function checkChildOrder(
  layers: ImportPersonDto[][],
  members: Map<string, Member>,
  tree: ExistingTree,
  issues: ImportIssue[],
): Map<string, number> {
  const groupOf = (person: ImportPersonDto): string | null => {
    for (const code of [person.fatherCode, person.motherCode]) {
      const key = optionalCodeKey(code);
      if (!key) continue;
      const member = members.get(key);
      return member?.kind === 'existing' ? 'id:' + member.person.id : 'code:' + key;
    }
    return null;
  };
  const stored = new Map<string, Array<{ name: string; order: number }>>();
  for (const person of tree.people.values()) {
    const parent = person.fatherId ?? person.motherId;
    if (!parent || person.orderInFamily === null) continue;
    const group = 'id:' + parent;
    stored.set(group, [
      ...(stored.get(group) ?? []),
      { name: person.name, order: person.orderInFamily },
    ]);
  }
  const groups = new Map<string, ImportPersonDto[]>();
  for (const person of [...layers.flat()].sort((left, right) => left.row - right.row)) {
    const group = groupOf(person);
    if (group) groups.set(group, [...(groups.get(group) ?? []), person]);
  }

  const orderByCode = new Map<string, number>();
  for (const [group, children] of groups) {
    const taken = new Map<number, string>();
    for (const sibling of stored.get(group) ?? [])
      taken.set(sibling.order, `${sibling.name} (đã có trong cây)`);
    let clean = true;
    for (const child of children) {
      if (child.orderInFamily == null) continue;
      const owner = taken.get(child.orderInFamily);
      if (owner) {
        issues.push({
          sheet: 'people',
          row: child.row,
          message: `Con thứ ${child.orderInFamily} bị trùng với ${owner}.`,
        });
        clean = false;
        continue;
      }
      taken.set(child.orderInFamily, `${child.name} (dòng ${child.row})`);
      orderByCode.set(codeKey(child.code), child.orderInFamily);
    }
    const missing = missingNumbers(taken.keys());
    const numbered = children.filter((child) => child.orderInFamily != null);
    if (clean && missing.length > 0 && numbered.length > 0) {
      const parentCode = children[0]!.fatherCode ?? children[0]!.motherCode;
      const parent = members.get(optionalCodeKey(parentCode) ?? '');
      issues.push({
        sheet: 'people',
        row: numbered[0]!.row,
        message: `Con thứ bị nhảy cóc: các con của ${parent ? lineageOf(parent).name : 'cùng cha mẹ'} đang có thứ tự ${[...taken.keys()].sort((a, b) => a - b).join(', ')}, thiếu ${missing.join(', ')}.`,
      });
    }
    let next = Math.max(0, ...taken.keys());
    for (const child of children) {
      if (child.orderInFamily == null) orderByCode.set(codeKey(child.code), (next += 1));
    }
  }
  return orderByCode;
}

/** Dates that contradict each other or the parents' lives. */
function checkDates(
  byCode: Map<string, ImportPersonDto>,
  members: Map<string, Member>,
  tree: ExistingTree,
  currentYear: number,
  issues: ImportIssue[],
): void {
  const storedByNameAndBirth = new Map<string, ExistingPerson>();
  for (const person of tree.people.values()) {
    if (person.birthDate?.trim()) {
      storedByNameAndBirth.set(nameKey(person.name) + '|' + person.birthDate.trim(), person);
    }
  }

  for (const person of byCode.values()) {
    const flag = (message: string): void => {
      issues.push({ sheet: 'people', row: person.row, message });
    };
    const bornIn = yearOf(person.birthDate);
    const diedIn = yearOf(person.deathDate);
    const deathKnown =
      Boolean(person.deathDate?.trim()) ||
      person.lunarDeathDay != null ||
      person.ageAtDeath != null;

    if (bornIn !== null && bornIn > currentYear) flag(`Năm sinh ${bornIn} ở tương lai.`);
    if (diedIn !== null && diedIn > currentYear) flag(`Năm mất ${diedIn} ở tương lai.`);
    if (person.isAlive === true && deathKnown) {
      flag('Đã có ngày mất, ngày giỗ hoặc hưởng thọ nhưng cột Còn sống là “Có”; hãy chọn “Không”.');
    }
    const alive = person.isAlive ?? !deathKnown;
    if (alive && bornIn !== null && currentYear - bornIn > 120) {
      flag(
        `Sinh năm ${bornIn} mà vẫn được tính là còn sống (${currentYear - bornIn} tuổi). Hãy điền ngày mất hoặc chọn Còn sống = “Không”.`,
      );
    }
    if (person.ageAtDeath != null && bornIn !== null && diedIn !== null) {
      const span = diedIn - bornIn;
      if (Math.abs(person.ageAtDeath - span) > 1) {
        flag(
          `Hưởng thọ ${person.ageAtDeath} không khớp với năm sinh ${bornIn} và năm mất ${diedIn} (${span} tuổi).`,
        );
      }
    }

    for (const [code, label, graceYears] of [
      [person.fatherCode, 'cha', 1],
      [person.motherCode, 'mẹ', 0],
    ] as const) {
      const parent = members.get(optionalCodeKey(code) ?? '');
      if (!parent || bornIn === null) continue;
      const facts = lineageOf(parent);
      if (facts.bornIn !== null && bornIn - facts.bornIn < 12) {
        flag(
          `Năm sinh ${bornIn} quá gần năm sinh của ${label} ${describe(parent)} (${facts.bornIn}); con phải sinh sau ${label} ít nhất 12 năm.`,
        );
      }
      if (facts.diedIn !== null && bornIn > facts.diedIn + graceYears) {
        flag(`Sinh năm ${bornIn}, sau khi ${label} ${describe(parent)} đã mất (${facts.diedIn}).`);
      }
    }

    const twin = person.birthDate?.trim()
      ? storedByNameAndBirth.get(nameKey(person.name) + '|' + person.birthDate.trim())
      : undefined;
    if (twin) {
      flag(
        `Có thể trùng với ${twin.name} đã có trong cây (cùng họ tên và ngày sinh ${person.birthDate?.trim()}). Nếu là cùng một người, hãy xóa dòng này.`,
      );
    }
  }
}

/** A child's mother must be one of the father's wives, stored or added by the file. */
function checkParentsMarried(
  byCode: Map<string, ImportPersonDto>,
  members: Map<string, Member>,
  couples: Map<string, ImportRelationshipDto>,
  tree: ExistingTree,
  issues: ImportIssue[],
): void {
  for (const person of byCode.values()) {
    const fatherKey = optionalCodeKey(person.fatherCode);
    const motherKey = optionalCodeKey(person.motherCode);
    if (!fatherKey || !motherKey || fatherKey === motherKey) continue;
    const father = members.get(fatherKey);
    const mother = members.get(motherKey);
    if (!father || !mother) continue;
    const stored =
      father.kind === 'existing' &&
      mother.kind === 'existing' &&
      tree.couples.has(father.person.id + '|' + mother.person.id);
    if (stored || couples.has(fatherKey + '|' + motherKey)) continue;
    issues.push({
      sheet: 'people',
      row: person.row,
      message: `Mẹ ${describe(mother)} chưa là vợ của cha ${describe(father)}. Hãy chọn bà ở cột Vợ trên dòng của cha.`,
    });
  }
}

/** Checks an import file against the stored tree without writing. A plan is returned only when clean. */
export function checkImport(
  input: ImportFamilyTreeDto,
  tree: ExistingTree,
  currentYear: number,
): ImportCheck {
  const issues: ImportIssue[] = [];
  const members = anchorExisting(input, tree, issues);
  const byCode = checkPeople(input.people, members, issues);
  const couples = checkRelationships(input.relationships, members, tree, issues);
  checkNamesakeSiblings(byCode, members, couples, tree, issues);
  checkParentsMarried(byCode, members, couples, tree, issues);
  checkDates(byCode, members, tree, currentYear, issues);
  const layers = layerByAncestry(byCode, issues);
  const generationByCode = layers ? checkGenerations(layers, members, couples, issues) : null;
  const orderByCode = layers ? checkChildOrder(layers, members, tree, issues) : null;
  if (byCode.size === 0 && couples.size === 0 && issues.length === 0) {
    issues.push({
      sheet: 'people',
      row: null,
      message: 'File chưa có thành viên hay cặp vợ chồng mới nào để nhập.',
    });
  }
  issues.sort(
    (left, right) => left.sheet.localeCompare(right.sheet) || (left.row ?? 0) - (right.row ?? 0),
  );
  const relationshipCount = couples.size;
  if (issues.length > 0 || !layers || !generationByCode || !orderByCode) {
    return { issues, plan: null, relationshipCount };
  }
  const existingIdByCode = new Map(
    [...members].flatMap(([key, member]) =>
      member.kind === 'existing' ? [[key, member.person.id] as const] : [],
    ),
  );
  return {
    issues,
    relationshipCount,
    plan: {
      layers,
      generationByCode,
      orderByCode,
      existingIdByCode,
      relationships: [...couples.values()],
    },
  };
}
