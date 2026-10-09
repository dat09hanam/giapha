import { displayPersonName } from '@/lib/person-name';
import type { FamilyTreeRelationship, Gender, Person } from '@/types/family-tree';
import { compareDates } from '@/lib/partial-date';

/**
 * Vietnamese kinship terms between two people on the tree, in the northern
 * convention. Rank between collateral lines follows the branch (the older
 * sibling's line is senior), not the people's own ages.
 */

export type Kinship = {
  /** What the second person is to the first, e.g. "chú ruột (bên nội)". */
  relation: string;
  /** How the first person addresses the second, e.g. "chú". */
  term: string;
  /** Ids linking the two people, first person first. */
  path: string[];
  commonAncestorId: string | null;
  /** Caveats, such as a missing birth order that leaves bác/chú undecided. */
  notes: string[];
};

export type KinshipGraph = {
  byId: ReadonlyMap<string, Person>;
  /** Current and widowed marriages; divorces are left out. */
  spousesById: ReadonlyMap<string, readonly string[]>;
};

type Seniority = 'senior' | 'junior' | 'unknown';

export function buildKinshipGraph(
  people: readonly Person[],
  relationships: readonly FamilyTreeRelationship[],
): KinshipGraph {
  const byId = new Map(people.map((person) => [person.id, person]));
  const spousesById = new Map<string, string[]>();
  for (const link of relationships) {
    if (link.status === 'DIVORCED' || !byId.has(link.husbandId) || !byId.has(link.wifeId)) continue;
    spousesById.set(link.husbandId, [...(spousesById.get(link.husbandId) ?? []), link.wifeId]);
    spousesById.set(link.wifeId, [...(spousesById.get(link.wifeId) ?? []), link.husbandId]);
  }
  return { byId, spousesById };
}

function byGender(gender: Gender, male: string, female: string, unknown: string): string {
  if (gender === 'MALE') return male;
  if (gender === 'FEMALE') return female;
  return unknown;
}

/** Whether `a`'s line ranks above `b`'s among siblings: birth order first, then birth date. */
function seniorityOf(a: Person, b: Person): Seniority {
  if (a.orderInFamily !== null && b.orderInFamily !== null && a.orderInFamily !== b.orderInFamily) {
    return a.orderInFamily < b.orderInFamily ? 'senior' : 'junior';
  }
  const birth = compareDates(a.birthDate, b.birthDate);
  if (birth) return birth < 0 ? 'senior' : 'junior';
  return 'unknown';
}

type AncestorStep = { distance: number; child: string | null };

/** Every ancestor on the tree with its nearest distance; fathers are walked before mothers. */
function ancestorsOf(graph: KinshipGraph, id: string): Map<string, AncestorStep> {
  const found = new Map<string, AncestorStep>([[id, { distance: 0, child: null }]]);
  const queue = [id];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]!;
    const person = graph.byId.get(current);
    const distance = found.get(current)!.distance;
    for (const parentId of [person?.fatherId, person?.motherId]) {
      if (parentId && graph.byId.has(parentId) && !found.has(parentId)) {
        found.set(parentId, { distance: distance + 1, child: current });
        queue.push(parentId);
      }
    }
  }
  return found;
}

/** Ids from the start person up to `ancestorId`, both included. */
function pathUp(ancestors: ReadonlyMap<string, AncestorStep>, ancestorId: string): string[] {
  const path: string[] = [];
  for (let id: string | null = ancestorId; id; id = ancestors.get(id)?.child ?? null) path.push(id);
  return path.reverse();
}

const DESCENDANT_TERMS = ['con', 'cháu', 'chắt', 'chút', 'chít'];

/** Who is the father's side and who the mother's: the gender of the parent on the path. */
function sideOf(person: Person | undefined): string {
  return person?.gender === 'FEMALE' ? 'ngoại' : 'nội';
}

/** The kinship of `toId` to `fromId` through their nearest common ancestor, if any. */
function bloodKinship(graph: KinshipGraph, fromId: string, toId: string): Kinship | null {
  const fromAncestors = ancestorsOf(graph, fromId);
  const toAncestors = ancestorsOf(graph, toId);
  let ancestorId: string | null = null;
  let best = Infinity;
  for (const [id, step] of toAncestors) {
    const fromStep = fromAncestors.get(id);
    if (fromStep && fromStep.distance + step.distance < best) {
      best = fromStep.distance + step.distance;
      ancestorId = id;
    }
  }
  if (!ancestorId) return null;

  const fromPath = pathUp(fromAncestors, ancestorId);
  const toPath = pathUp(toAncestors, ancestorId);
  const up = fromPath.length - 1;
  const down = toPath.length - 1;
  const from = graph.byId.get(fromId)!;
  const to = graph.byId.get(toId)!;
  const path = [...fromPath, ...toPath.slice(0, -1).reverse()];
  const notes: string[] = [];
  const result = (relation: string, term: string): Kinship => ({
    relation,
    term,
    path,
    commonAncestorId: up > 0 && down > 0 ? ancestorId : null,
    notes,
  });

  // `to` is a direct ancestor.
  if (down === 0) {
    const side = sideOf(graph.byId.get(fromPath[1]!));
    if (up === 1) {
      const term = byGender(to.gender, 'bố', 'mẹ', 'bố/mẹ');
      return result(term, term);
    }
    if (up === 2) {
      const term = byGender(to.gender, 'ông', 'bà', 'ông/bà');
      return result(`${term} ${side}`, term);
    }
    if (up === 3) return result(`cụ ${side}`, 'cụ');
    if (up === 4) return result(`kỵ ${side}`, 'kỵ');
    return result(`tổ tiên ${up} đời trên (bên ${side})`, 'cụ');
  }

  // `to` is a direct descendant.
  if (up === 0) {
    const side = sideOf(graph.byId.get(toPath[down - 1]!));
    if (down === 1) return result(byGender(to.gender, 'con trai', 'con gái', 'con'), 'con');
    const term = DESCENDANT_TERMS[down - 1];
    return term ? result(`${term} ${side}`, term) : result(`hậu duệ ${down} đời dưới`, 'cháu');
  }

  // Collateral: compare the two children of the common ancestor that start each line.
  const fromBranch = graph.byId.get(fromPath[up - 1]!)!;
  const toBranch = graph.byId.get(toPath[down - 1]!)!;
  const generationGap = up - down;

  if (generationGap < 0) {
    const gap = -generationGap;
    // A sibling's child is a cháu, not a con; further down the terms match direct descendants.
    const term = gap === 1 ? 'cháu' : DESCENDANT_TERMS[gap - 1];
    if (!term) return result(`hậu duệ ${gap} đời dưới`, 'cháu');
    return result(`${term} ${up === 1 ? 'ruột' : 'họ'}`, term);
  }

  const seniority = seniorityOf(toBranch, fromBranch);
  if (seniority === 'unknown') {
    notes.push(
      `Chưa rõ thứ tự giữa ${displayPersonName(fromBranch.name)} và ${displayPersonName(toBranch.name)} ` +
        '(thứ tự con hoặc ngày sinh), nên chưa phân định được vai trên – dưới.',
    );
  }

  if (generationGap === 0) {
    const term = {
      senior: byGender(to.gender, 'anh', 'chị', 'anh/chị'),
      junior: 'em',
      unknown: byGender(to.gender, 'anh/em', 'chị/em', 'anh/chị/em'),
    }[seniority];
    if (up > 1) return result(`${term} họ`, term);

    const sameFather = from.fatherId !== null && from.fatherId === to.fatherId;
    const sameMother = from.motherId !== null && from.motherId === to.motherId;
    const bothKnown = from.fatherId && to.fatherId && from.motherId && to.motherId;
    const closeness =
      bothKnown && !sameMother
        ? 'cùng cha khác mẹ'
        : bothKnown && !sameFather
          ? 'cùng mẹ khác cha'
          : 'ruột';
    const relation =
      term === 'em'
        ? `em ${byGender(to.gender, 'trai ', 'gái ', '')}${closeness}`
        : `${term} ${closeness}`;
    return result(relation, term);
  }

  // `to` is in an elder generation: bác/chú/cô on the father's line, bác/cậu/dì on the mother's.
  const lineal = graph.byId.get(fromPath[generationGap]!)!;
  const paternal = lineal.gender !== 'FEMALE';
  const junior = paternal
    ? byGender(to.gender, 'chú', 'cô', 'chú/cô')
    : byGender(to.gender, 'cậu', 'dì', 'cậu/dì');
  const base = { senior: 'bác', junior, unknown: `bác/${junior}` }[seniority];
  const prefix =
    generationGap === 1
      ? ''
      : generationGap === 2
        ? `${byGender(to.gender, 'ông', 'bà', 'ông/bà')} `
        : generationGap === 3
          ? 'cụ '
          : 'kỵ ';
  const term = `${prefix}${base}`;
  const side = sideOf(graph.byId.get(fromPath[1]!));
  return result(`${term} ${down === 1 ? 'ruột' : 'họ'} (bên ${side})`, term);
}

const SPOUSE_TERMS: Record<string, string> = {
  bố: 'dì',
  mẹ: 'dượng',
  ông: 'bà',
  bà: 'ông',
  bác: 'bác',
  chú: 'thím',
  cô: 'dượng',
  cậu: 'mợ',
  dì: 'dượng',
  anh: 'chị',
  chị: 'anh',
};

/** What one calls the spouse of someone one calls `term`: chú → thím, anh → chị, con → con. */
function spouseTerm(term: string): string {
  const alternatives = term.split('/').map((option) =>
    option
      .split(' ')
      .map((word) => SPOUSE_TERMS[word] ?? word)
      .join(' '),
  );
  return [...new Set(alternatives)].join('/');
}

function spouseWord(person: Person): string {
  return byGender(person.gender, 'chồng', 'vợ', 'vợ/chồng');
}

/**
 * How `fromId` stands to `toId`: by blood first, then through either one's
 * marriage. Someone who married in calls relatives as their spouse does.
 */
export function findKinship(graph: KinshipGraph, fromId: string, toId: string): Kinship | null {
  const from = graph.byId.get(fromId);
  const to = graph.byId.get(toId);
  if (!from || !to || fromId === toId) return null;

  const fromSpouses = graph.spousesById.get(fromId) ?? [];
  const toSpouses = graph.spousesById.get(toId) ?? [];
  if (fromSpouses.includes(toId)) {
    const relation = spouseWord(to);
    return {
      relation,
      term: byGender(to.gender, 'anh', 'em', 'anh/em'),
      path: [fromId, toId],
      commonAncestorId: null,
      notes: [],
    };
  }

  const blood = bloodKinship(graph, fromId, toId);
  if (blood) return blood;

  // `to` married one of `from`'s blood relatives.
  for (const spouseId of toSpouses) {
    const link = bloodKinship(graph, fromId, spouseId);
    if (link) {
      return {
        ...link,
        relation: `${spouseWord(to)} của ${link.relation}`,
        term: spouseTerm(link.term),
        path: [...link.path, toId],
      };
    }
  }

  // `from` married into `to`'s family.
  for (const spouseId of fromSpouses) {
    const link = bloodKinship(graph, spouseId, toId);
    if (link) {
      const spouse = graph.byId.get(spouseId)!;
      const relation =
        link.relation === 'bố' || link.relation === 'mẹ'
          ? `${link.relation} ${spouseWord(spouse)}`
          : `${link.relation} của ${spouseWord(spouse)}`;
      return { ...link, relation, path: [fromId, ...link.path] };
    }
  }

  // Both married in, e.g. the wives of two brothers.
  for (const fromSpouseId of fromSpouses) {
    for (const toSpouseId of toSpouses) {
      const link = bloodKinship(graph, fromSpouseId, toSpouseId);
      if (link) {
        const fromSpouse = graph.byId.get(fromSpouseId)!;
        return {
          ...link,
          relation: `${spouseWord(to)} của ${link.relation} của ${spouseWord(fromSpouse)}`,
          term: spouseTerm(link.term),
          path: [fromId, ...link.path, toId],
        };
      }
    }
  }

  return null;
}
