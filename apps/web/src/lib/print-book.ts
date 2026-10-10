import {
  BRACKET_INSET,
  computeGenerations,
  layoutFamily,
  sortMembers,
  type FamilyLayout,
  type LayoutPerson,
  type LayoutRelationship,
} from '@/lib/family-layout';
import { displayPersonName, displayPersonTitle } from '@/lib/person-name';
import type { FamilyTreeResponse, Person } from '@/types/family-tree';
import { yearOf } from '@/lib/partial-date';

export type PaperSize = 'A4' | 'A3' | 'A2' | 'A1' | 'A0';
export type Orientation = 'leftToRight' | 'topDown' | 'rotated';
export type PaperOptions = { size: PaperSize; orientation: Orientation };

export const PAPER_SIZES: Record<PaperSize, { long: number; short: number }> = {
  A4: { long: 297, short: 210 },
  A3: { long: 420, short: 297 },
  A2: { long: 594, short: 420 },
  A1: { long: 841, short: 594 },
  A0: { long: 1189, short: 841 },
};

const PX_PER_MM = 96 / 25.4;

export const PRINT_CARD = { width: 132, height: 80 } as const;
export const NOTE_HEIGHT = 20;
const BRANCH_GAP = 48;
const BAND_GAP = 28;

export type TreeDirection = 'vertical' | 'horizontal';

type Axes = {
  across: number;
  along: number;
  spouseGap: number;
  siblingGap: number;
  rowGap: number;
  note: number;
};

const AXES: Record<TreeDirection, Axes> = {
  vertical: {
    across: PRINT_CARD.width,
    along: PRINT_CARD.height,
    spouseGap: 16,
    siblingGap: 20,
    rowGap: 64,
    note: NOTE_HEIGHT,
  },
  horizontal: {
    across: PRINT_CARD.height,
    along: PRINT_CARD.width,
    spouseGap: 10,
    siblingGap: 18,
    rowGap: 96,
    note: 92,
  },
};

export const PAGE_FRAME = {
  margin: Math.round(10 * PX_PER_MM),
  header: 42,
  footer: 22,
  gutter: 52,
  labelStrip: 26,
} as const;

const TOC_LINE = 22;
const TOC_COLUMN = 420;
const INDEX_LINE = 17;
const INDEX_COLUMN = 250;
export const LIST_HEADING = 44;

type Rect = { left: number; top: number; width: number; height: number };

export type PageGeometry = {
  widthMm: number;
  heightMm: number;
  width: number;
  height: number;
  direction: TreeDirection;
  rotated: boolean;
  tree: Rect;
  text: Rect;
  columns: number;
  rows: number;
};

export function pageGeometry({ size, orientation }: PaperOptions): PageGeometry {
  const { long, short } = PAPER_SIZES[size];
  const wide = orientation === 'rotated';
  const widthMm = wide ? long : short;
  const heightMm = wide ? short : long;
  const width = widthMm * PX_PER_MM;
  const height = heightMm * PX_PER_MM;
  const { margin, header, footer, gutter, labelStrip } = PAGE_FRAME;
  const text: Rect = {
    left: margin,
    top: margin + header,
    width: width - 2 * margin,
    height: height - 2 * margin - header - footer,
  };
  const rotated = orientation === 'rotated';
  const direction: TreeDirection = orientation === 'leftToRight' ? 'horizontal' : 'vertical';
  const tree: Rect =
    direction === 'vertical'
      ? { ...text, left: rotated ? margin : margin + gutter, width: text.width - gutter }
      : { ...text, top: text.top + labelStrip, height: text.height - labelStrip };
  const axes = AXES[direction];
  const room = treeRoom(tree, direction);
  return {
    widthMm,
    heightMm,
    width,
    height,
    direction,
    rotated,
    tree,
    text,
    columns: Math.max(
      1,
      Math.floor((room.across + axes.siblingGap) / (axes.across + axes.siblingGap)),
    ),
    rows: Math.max(
      2,
      Math.floor((room.along - axes.along - 2 * axes.note) / (axes.along + axes.rowGap)) + 1,
    ),
  };
}

export function paperOf(geometry: PageGeometry): { widthMm: number; heightMm: number } {
  return geometry.rotated
    ? { widthMm: geometry.heightMm, heightMm: geometry.widthMm }
    : { widthMm: geometry.widthMm, heightMm: geometry.heightMm };
}

function treeRoom(tree: Rect, direction: TreeDirection): { across: number; along: number } {
  return direction === 'vertical'
    ? { across: tree.width, along: tree.height }
    : { across: tree.height, along: tree.width };
}

export type PrintCard = {
  id: string;
  x: number;
  y: number;
  name: string;
  caption: string | null;
  life: string | null;
};

export type PageNote = { x: number; y: number; text: string; anchor: 'below' | 'after' | 'before' };

export type TreePage = {
  kind: 'tree';
  number: number;
  title: string;
  subtitle: string | null;
  direction: TreeDirection;
  width: number;
  height: number;
  scale: number;
  cards: PrintCard[];
  paths: string[];
  notes: PageNote[];
  rowLabels: { at: number; generation: number }[];
};

export type ContentsEntry = { title: string; page: number; depth: number };
export type IndexEntry = { name: string; generation: number; pages: string };

export type BookPage =
  | { kind: 'cover'; number: number }
  | { kind: 'intro'; number: number }
  | { kind: 'poster'; number: number }
  | { kind: 'contents'; number: number; first: boolean; columns: number; entries: ContentsEntry[] }
  | TreePage
  | { kind: 'index'; number: number; first: boolean; columns: number; entries: IndexEntry[] };

export type SheetKind = 'text' | 'tree';

export function sheetOf(page: BookPage): SheetKind {
  return page.kind === 'tree' || page.kind === 'poster' ? 'tree' : 'text';
}

export type Book = {
  sheets: Record<SheetKind, PageGeometry>;
  pages: BookPage[];
  treePageCount: number;
  generationCount: number;
};

type Unit = {
  id: string;
  key: string;
  partners: string[];
  generation: number;
  parent: string | null;
  children: string[];
};

function buildUnits(
  people: readonly LayoutPerson[],
  relationships: readonly LayoutRelationship[],
): { units: Map<string, Unit>; roots: string[] } {
  const byId = new Map(people.map((person) => [person.id, person]));
  const links = new Map<string, string>();
  function find(id: string): string {
    const up = links.get(id);
    if (!up || up === id) return id;
    const root = find(up);
    links.set(id, root);
    return root;
  }
  function join(left: string, right: string): void {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) links.set(rightRoot, leftRoot);
  }
  relationships.forEach((relationship) => {
    if (byId.has(relationship.husbandId) && byId.has(relationship.wifeId)) {
      join(relationship.husbandId, relationship.wifeId);
    }
  });
  people.forEach((person) => {
    if (
      person.fatherId &&
      person.motherId &&
      byId.has(person.fatherId) &&
      byId.has(person.motherId)
    ) {
      join(person.fatherId, person.motherId);
    }
  });

  const membersOf = new Map<string, LayoutPerson[]>();
  people.forEach((person) => {
    const unitId = find(person.id);
    membersOf.set(unitId, [...(membersOf.get(unitId) ?? []), person]);
  });

  const units = new Map<string, Unit>();
  membersOf.forEach((members, unitId) => {
    const sorted = [...members].sort(sortMembers);
    const inOtherUnit = (parentId: string | null): parentId is string =>
      Boolean(parentId && byId.has(parentId) && find(parentId) !== unitId);
    const blood = sorted.find(
      (member) => inOtherUnit(member.fatherId) || inOtherUnit(member.motherId),
    );
    const key = blood ?? sorted.find((member) => member.gender === 'MALE') ?? sorted[0]!;
    units.set(unitId, {
      id: unitId,
      key: key.id,
      partners: sorted.filter((member) => member !== key).map((member) => member.id),
      generation: Math.min(...members.map((member) => member.generation)),
      parent: blood ? find(inOtherUnit(blood.fatherId) ? blood.fatherId : blood.motherId!) : null,
      children: [],
    });
  });

  const compareUnits = (left: string, right: string): number =>
    sortMembers(byId.get(units.get(left)!.key)!, byId.get(units.get(right)!.key)!);
  units.forEach((unit) => {
    if (unit.parent) units.get(unit.parent)!.children.push(unit.id);
  });
  units.forEach((unit) => unit.children.sort(compareUnits));

  const roots = [...units.keys()].filter((unitId) => !units.get(unitId)!.parent).sort(compareUnits);
  const reached = new Set<string>();
  const reach = (unitId: string): void => {
    if (reached.has(unitId)) return;
    reached.add(unitId);
    units.get(unitId)!.children.forEach(reach);
  };
  roots.forEach(reach);
  for (const unitId of [...units.keys()].sort(compareUnits)) {
    if (reached.has(unitId)) continue;
    const unit = units.get(unitId)!;
    const parent = units.get(unit.parent!)!;
    parent.children = parent.children.filter((childId) => childId !== unitId);
    unit.parent = null;
    roots.push(unitId);
    reach(unitId);
  }

  return { units, roots };
}

function years(person: Person): string | null {
  const born = yearOf(person.birthDate)?.toString() ?? null;
  const died = yearOf(person.deathDate)?.toString() ?? null;
  if (born && died) return `${born}–${died}`;
  if (born) return person.isAlive ? `s. ${born}` : `${born}–?`;
  if (died) return `?–${died}`;
  return null;
}

function lifeLine(person: Person): string | null {
  const anniversary =
    person.lunarDeathDay && person.lunarDeathMonth
      ? `Giỗ ${person.lunarDeathDay}/${person.lunarDeathMonth} ÂL`
      : null;
  return [years(person), anniversary].filter(Boolean).join(' · ') || null;
}

function pageRange(pages: readonly number[]): string {
  const first = pages[0];
  const last = pages[pages.length - 1];
  if (first === undefined || last === undefined) return '';
  return first === last ? `trang ${first}` : `trang ${first}–${last}`;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks.length ? chunks : [[]];
}

type Branch = {
  root: string;
  part: { index: number; total: number } | null;
  unitIds: string[];
  continued: string[];
  layout: FamilyLayout;
  width: number;
  firstGeneration: number;
  lastGeneration: number;
  from: number | null;
};

type Band = { branches: number[]; width: number; firstGeneration: number; lastGeneration: number };

export function buildPrintBook(tree: FamilyTreeResponse, paper: PaperOptions): Book {
  const geometry = pageGeometry(paper);
  const textSheet = pageGeometry({ size: paper.size, orientation: 'topDown' });
  const horizontal = geometry.direction === 'horizontal';
  const axes = AXES[geometry.direction];
  const { across: W, along: H, spouseGap, siblingGap, rowGap } = axes;
  const generationGap = H + rowGap;
  const room = treeRoom(geometry.tree, geometry.direction);
  const capacity = room.across;
  const bandHeight = (firstGeneration: number, lastGeneration: number): number =>
    axes.note + (lastGeneration - firstGeneration) * generationGap + H + axes.note;

  const relationships: LayoutRelationship[] = tree.relationships.map((relationship) => ({
    husbandId: relationship.husbandId,
    wifeId: relationship.wifeId,
    wifeOrder: relationship.wifeOrder ?? 1,
  }));
  const basePeople: LayoutPerson[] = tree.people.map((person) => ({
    id: person.id,
    name: person.name,
    gender: person.gender,
    fatherId: person.fatherId,
    motherId: person.motherId,
    generation: person.generation ?? 1,
    orderInFamily: person.orderInFamily ?? 1,
  }));
  const generations = computeGenerations(basePeople, relationships);
  const people = basePeople.map((person) => ({
    ...person,
    generation: generations.get(person.id) ?? 1,
  }));
  const layoutPeople = new Map(people.map((person) => [person.id, person]));
  const peopleById = new Map(tree.people.map((person) => [person.id, person]));
  const { units, roots } = buildUnits(people, relationships);
  const unit = (unitId: string): Unit => units.get(unitId)!;
  const keyPerson = (unitId: string): Person => peopleById.get(unit(unitId).key)!;

  type Plan = { root: string; rootChildren: string[]; expanded: Set<string> };
  function shownChildren(plan: Plan, unitId: string): string[] {
    if (!plan.expanded.has(unitId)) return [];
    return unitId === plan.root ? plan.rootChildren : unit(unitId).children;
  }
  function shownUnits(plan: Plan): string[] {
    const shown: string[] = [];
    const visit = (unitId: string): void => {
      shown.push(unitId);
      shownChildren(plan, unitId).forEach(visit);
    };
    visit(plan.root);
    return shown;
  }
  function ownWidth(unitId: string): number {
    const count = 1 + unit(unitId).partners.length;
    return count * W + (count - 1) * spouseGap;
  }
  function estimatedWidth(plan: Plan, unitId: string): number {
    const children = shownChildren(plan, unitId);
    if (!children.length) return ownWidth(unitId);
    const span =
      children.reduce((total, childId) => total + estimatedWidth(plan, childId), 0) +
      (children.length - 1) * siblingGap;
    return Math.max(ownWidth(unitId), span);
  }

  function layoutUnits(unitIds: readonly string[]): FamilyLayout {
    const pagePeople = unitIds.flatMap((unitId) =>
      [unit(unitId).key, ...unit(unitId).partners].map((personId) => layoutPeople.get(personId)!),
    );
    return layoutFamily(
      { people: pagePeople, relationships },
      { nodeWidth: W, spouseGap, siblingGap, generationGap },
    );
  }
  function layoutBounds(layout: FamilyLayout): { minX: number; width: number } {
    const xs = [...layout.positions.values()].map((position) => position.x);
    const minX = Math.min(...xs);
    return { minX, width: Math.max(...xs) + W - minX };
  }

  function planBranch(root: string, rootChildren: string[]): Plan {
    const plan: Plan = { root, rootChildren, expanded: new Set() };
    if (!rootChildren.length) return plan;
    plan.expanded.add(root);
    const expansions: string[] = [];
    const rootGeneration = unit(root).generation;
    const fitsRows = (unitId: string): boolean =>
      unit(unitId).children.every(
        (childId) => unit(childId).generation - rootGeneration < geometry.rows,
      );

    let level = [...rootChildren];
    while (level.length) {
      const next: string[] = [];
      level
        .filter((unitId) => unit(unitId).children.length > 0 && fitsRows(unitId))
        .sort((left, right) => unit(left).children.length - unit(right).children.length)
        .forEach((unitId) => {
          plan.expanded.add(unitId);
          if (estimatedWidth(plan, root) > capacity) {
            plan.expanded.delete(unitId);
            return;
          }
          expansions.push(unitId);
          next.push(...unit(unitId).children);
        });
      level = next;
    }

    while (expansions.length && layoutBounds(layoutUnits(shownUnits(plan))).width > capacity) {
      plan.expanded.delete(expansions.pop()!);
    }
    return plan;
  }

  function partsOf(root: string): string[][] {
    const parts: string[][] = [[]];
    let width = 0;
    unit(root).children.forEach((childId) => {
      const part = parts[parts.length - 1]!;
      const added = (part.length ? siblingGap : 0) + ownWidth(childId);
      if (part.length && width + added > capacity) {
        parts.push([childId]);
        width = ownWidth(childId);
      } else {
        part.push(childId);
        width += added;
      }
    });
    return parts;
  }

  function branchesOf(root: string, from: number | null): Branch[] {
    const parts = partsOf(root);
    return parts.map((rootChildren, index) => {
      const plan = planBranch(root, rootChildren);
      const unitIds = shownUnits(plan);
      const layout = layoutUnits(unitIds);
      const x = (unitId: string): number => layout.positions.get(unit(unitId).key)?.x ?? 0;
      const rows = unitIds.map((unitId) => unit(unitId).generation);
      return {
        root,
        part: parts.length > 1 ? { index: index + 1, total: parts.length } : null,
        unitIds,
        continued: unitIds
          .filter((unitId) => !plan.expanded.has(unitId) && unit(unitId).children.length > 0)
          .sort((left, right) => x(left) - x(right)),
        layout,
        width: layoutBounds(layout).width,
        firstGeneration: Math.min(...rows),
        lastGeneration: Math.max(...rows),
        from,
      };
    });
  }

  const branches: Branch[] = [];
  const contentsOrder: { root: string; depth: number }[] = [];
  function visit(rootIds: readonly string[], from: number | null, depth: number): void {
    const first = branches.length;
    rootIds.forEach((root) => {
      if (unit(root).children.length) contentsOrder.push({ root, depth });
      branches.push(...branchesOf(root, from));
    });
    for (let index = first, end = branches.length; index < end; index += 1) {
      const { continued } = branches[index]!;
      if (continued.length) visit(continued, index, depth + 1);
    }
  }
  visit(
    roots.filter((root) => unit(root).children.length > 0),
    null,
    0,
  );
  visit(
    roots.filter((root) => unit(root).children.length === 0),
    null,
    0,
  );

  const pages: Band[][] = [];
  const pageOfBranch: number[] = [];
  const pageHeight = (bands: readonly Band[]): number =>
    bands.reduce(
      (total, band) => total + bandHeight(band.firstGeneration, band.lastGeneration),
      0,
    ) +
    (bands.length - 1) * BAND_GAP;
  branches.forEach((branch, index) => {
    const bands = pages[pages.length - 1];
    const band = bands?.[bands.length - 1];
    const widened = band && {
      branches: [...band.branches, index],
      width: band.width + BRANCH_GAP + branch.width,
      firstGeneration: Math.min(band.firstGeneration, branch.firstGeneration),
      lastGeneration: Math.max(band.lastGeneration, branch.lastGeneration),
    };
    const alone: Band = {
      branches: [index],
      width: branch.width,
      firstGeneration: branch.firstGeneration,
      lastGeneration: branch.lastGeneration,
    };
    if (
      bands &&
      widened &&
      widened.width <= capacity &&
      pageHeight([...bands.slice(0, -1), widened]) <= room.along
    ) {
      bands[bands.length - 1] = widened;
    } else if (bands && pageHeight([...bands, alone]) <= room.along) {
      bands.push(alone);
    } else {
      pages.push([alone]);
    }
    pageOfBranch[index] = pages.length - 1;
  });

  const contentsColumns = Math.max(1, Math.floor(textSheet.text.width / TOC_COLUMN));
  const contentsPerPage =
    contentsColumns * Math.max(1, Math.floor((textSheet.text.height - LIST_HEADING) / TOC_LINE));
  const contentsPageCount = Math.ceil((contentsOrder.length + 2) / contentsPerPage);
  const posterPage = 3 + contentsPageCount;
  const firstTreePage = posterPage + 1;
  const pageNumber = (branchIndex: number): number => firstTreePage + pageOfBranch[branchIndex]!;
  const drawnOn = new Map<string, number[]>();
  branches.forEach((branch, index) => {
    const numbers = drawnOn.get(branch.root) ?? [];
    if (!numbers.includes(pageNumber(index))) numbers.push(pageNumber(index));
    drawnOn.set(branch.root, numbers);
  });

  const shownOn = new Map<string, number[]>();
  branches.forEach((branch, index) =>
    branch.unitIds.forEach((unitId) =>
      [unit(unitId).key, ...unit(unitId).partners].forEach((personId) => {
        const numbers = shownOn.get(personId) ?? [];
        if (!numbers.includes(pageNumber(index))) numbers.push(pageNumber(index));
        shownOn.set(personId, numbers);
      }),
    ),
  );

  function spouseLabel(unitId: string, partner: Person): string {
    const wives = tree.relationships.filter(
      (relationship) => relationship.husbandId === unit(unitId).key,
    );
    const marriage = wives.find((relationship) => relationship.wifeId === partner.id);
    if (partner.gender === 'FEMALE') {
      return marriage && wives.length > 1 ? `Vợ ${marriage.wifeOrder ?? 1}` : 'Vợ';
    }
    return partner.gender === 'MALE' ? 'Chồng' : 'Bạn đời';
  }

  function caption(person: Person, unitId: string): string | null {
    const parts: string[] = [];
    if (person.id !== unit(unitId).key) parts.push(spouseLabel(unitId, person));
    if (person.honorific?.trim()) parts.push(displayPersonName(person.honorific));
    if (person.id === unit(unitId).key && person.fatherId && person.motherId) {
      const wives = tree.relationships.filter(
        (relationship) => relationship.husbandId === person.fatherId,
      );
      const mother = wives.find((relationship) => relationship.wifeId === person.motherId);
      if (mother && wives.length > 1) parts.push(`Con vợ ${mother.wifeOrder ?? 1}`);
    }
    return parts.length ? parts.join(' · ') : null;
  }

  function branchTitle(root: string, part: Branch['part'], continued: boolean): string {
    const key = keyPerson(root);
    const suffix = part ? ` (phần ${part.index}/${part.total})` : '';
    if (!continued) {
      return unit(root).children.length
        ? `Thuỷ tổ ${displayPersonTitle(key)}${suffix}`
        : displayPersonTitle(key);
    }
    return `Chi ${key.gender === 'FEMALE' ? 'bà' : 'ông'} ${displayPersonName(key.name)}${suffix}`;
  }

  function pageTitles(branchIndexes: readonly number[]): {
    title: string;
    subtitle: string | null;
  } {
    const pageBranches = branchIndexes.map((index) => branches[index]!);
    const titles = pageBranches.map((branch) =>
      branchTitle(branch.root, branch.part, branch.from !== null),
    );
    const sources = [...new Set(pageBranches.map((branch) => branch.from))];
    const from =
      sources.length === 1 && sources[0] !== null && sources[0] !== undefined
        ? `tiếp theo từ trang ${pageNumber(sources[0])}`
        : null;
    if (pageBranches.length > 1) {
      return {
        title:
          pageBranches.length === 2
            ? titles.join(' · ')
            : `${titles[0]} và ${titles.length - 1} chi khác`,
        subtitle: from,
      };
    }
    const branch = pageBranches[0]!;
    if (branch.from === null) return { title: titles[0]!, subtitle: null };
    const key = keyPerson(branch.root);
    const parents = [key.fatherId, key.motherId]
      .map((parentId) => (parentId ? peopleById.get(parentId) : undefined))
      .filter((parent): parent is Person => Boolean(parent))
      .map((parent) => displayPersonName(parent.name));
    const subtitle = [
      `Đời ${unit(branch.root).generation}`,
      parents.length ? `con của ${parents.join(' và ')}` : null,
      from,
    ]
      .filter(Boolean)
      .join(' · ');
    return { title: titles[0]!, subtitle };
  }

  function drawPage(bands: readonly Band[], pageIndex: number): TreePage {
    type Point = { x: number; y: number };
    const width = Math.max(...bands.map((band) => band.width));
    const turn = ({ x, y }: Point): Point =>
      horizontal ? { x: y, y: x } : geometry.rotated ? { x: width - x, y } : { x, y };
    const corner = (point: Point): Point =>
      geometry.rotated ? { x: width - point.x - W, y: point.y } : turn(point);
    const line = (points: readonly Point[]): string =>
      points
        .map(turn)
        .map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`)
        .join(' ');

    const cards: PrintCard[] = [];
    const paths: string[] = [];
    const notes: PageNote[] = [];
    const rowLabels: TreePage['rowLabels'] = [];
    let bandTop = 0;

    bands.forEach((band) => {
      const rowTop = (generation: number): number =>
        bandTop + axes.note + (generation - band.firstGeneration) * generationGap;
      let left = (width - band.width) / 2;
      band.branches.forEach((branchIndex) => {
        const branch = branches[branchIndex]!;
        const { minX, width: branchWidth } = layoutBounds(branch.layout);
        const unitOfPerson = new Map(
          branch.unitIds.flatMap((unitId) =>
            [unit(unitId).key, ...unit(unitId).partners].map(
              (personId) => [personId, unitId] as const,
            ),
          ),
        );
        const at = (personId: string): Point => ({
          x: left + (branch.layout.positions.get(personId)?.x ?? minX) - minX,
          y: rowTop(unit(unitOfPerson.get(personId)!).generation),
        });
        const span = (
          unitId: string,
        ): { start: number; end: number; row: number; drop: number } => {
          const members = [unit(unitId).key, ...unit(unitId).partners];
          const spots = members.map(at);
          const drops = branch.layout.marriages
            .filter((marriage) => !marriage.adjacent && members.includes(marriage.husbandId))
            .map((marriage) => marriage.drop);
          return {
            start: Math.min(...spots.map((spot) => spot.x)),
            end: Math.max(...spots.map((spot) => spot.x)) + W,
            row: spots[0]!.y,
            drop: Math.max(0, ...drops),
          };
        };

        unitOfPerson.forEach((unitId, personId) => {
          const person = peopleById.get(personId)!;
          cards.push({
            id: personId,
            ...corner(at(personId)),
            name: displayPersonName(person.name),
            caption: caption(person, unitId),
            life: lifeLine(person),
          });
        });
        branch.layout.marriages.forEach((marriage) => {
          const first = at(marriage.leftId);
          const second = at(marriage.rightId);
          if (marriage.adjacent) {
            paths.push(
              line([
                { x: first.x + W, y: first.y + H / 2 },
                { x: second.x, y: first.y + H / 2 },
              ]),
            );
            return;
          }
          const bracket = Math.max(first.y, second.y) + H + marriage.drop;
          paths.push(
            line([
              { x: first.x + W / 2 + BRACKET_INSET, y: first.y + H },
              { x: first.x + W / 2 + BRACKET_INSET, y: bracket },
              { x: second.x + W / 2 - BRACKET_INSET, y: bracket },
              { x: second.x + W / 2 - BRACKET_INSET, y: second.y + H },
            ]),
          );
        });
        branch.layout.childLinks.forEach((link) => {
          const source = at(link.sourceId);
          const child = at(link.childId);
          const fromMarriageLine = link.sourceHandle === 'spouse-source';
          const startX = (fromMarriageLine ? source.x + W : source.x + W / 2) + link.offsetX;
          const startY = (fromMarriageLine ? source.y + H / 2 : source.y + H) + link.offsetY;
          const busY = Math.max(startY, child.y - link.busOffset);
          paths.push(
            line([
              { x: startX, y: startY },
              { x: startX, y: busY },
              { x: child.x + W / 2, y: busY },
              { x: child.x + W / 2, y: child.y },
            ]),
          );
        });

        if (branch.from !== null) {
          const root = span(branch.root);
          const text =
            `Tiếp từ trang ${pageNumber(branch.from)}` +
            (branch.part ? ` · phần ${branch.part.index}/${branch.part.total}` : '');
          const middle = (root.start + root.end) / 2;
          notes.push(
            horizontal
              ? { ...turn({ x: middle, y: root.row - 4 }), text, anchor: 'before' }
              : { ...turn({ x: middle, y: root.row - NOTE_HEIGHT + 2 }), text, anchor: 'below' },
          );
        }
        branch.continued.forEach((unitId) => {
          const family = span(unitId);
          const beyond = family.row + H + family.drop + (horizontal ? 4 : 3);
          notes.push({
            ...turn({ x: (family.start + family.end) / 2, y: beyond }),
            text: `Xem ${pageRange(drawnOn.get(unitId) ?? [])}`,
            anchor: horizontal ? 'after' : 'below',
          });
        });
        left += branchWidth + BRANCH_GAP;
      });

      for (
        let generation = band.firstGeneration;
        generation <= band.lastGeneration;
        generation += 1
      ) {
        rowLabels.push({ generation, at: rowTop(generation) + H / 2 });
      }
      bandTop += bandHeight(band.firstGeneration, band.lastGeneration) + BAND_GAP;
    });

    const length = bandTop - BAND_GAP;
    const size = horizontal ? { x: length, y: width } : { x: width, y: length };
    return {
      kind: 'tree',
      number: firstTreePage + pageIndex,
      ...pageTitles(bands.flatMap((band) => band.branches)),
      direction: geometry.direction,
      width: size.x,
      height: size.y,
      scale: Math.min(1, geometry.tree.width / size.x, geometry.tree.height / size.y),
      cards,
      paths,
      notes,
      rowLabels,
    };
  }

  const treePages = pages.map(drawPage);
  const indexStart = firstTreePage + treePages.length;
  const contents = chunk(
    [
      { title: 'Phả đồ tổng quát', page: posterPage, depth: 0 },
      ...contentsOrder.map<ContentsEntry>(({ root, depth }) => {
        const firstBranch = branches.findIndex((branch) => branch.root === root);
        return {
          title: branchTitle(root, null, branches[firstBranch]!.from !== null),
          page: pageNumber(firstBranch),
          depth,
        };
      }),
      { title: 'Tra cứu theo tên', page: indexStart, depth: 0 },
    ],
    contentsPerPage,
  );

  const indexColumns = Math.max(1, Math.floor(textSheet.text.width / INDEX_COLUMN));
  const indexPerPage =
    indexColumns * Math.max(1, Math.floor((textSheet.text.height - LIST_HEADING) / INDEX_LINE));
  const indexEntries = tree.people
    .filter((person) => shownOn.has(person.id))
    .map<IndexEntry>((person) => ({
      name: displayPersonName(person.name),
      generation: generations.get(person.id) ?? 1,
      pages: shownOn.get(person.id)!.join(', '),
    }))
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name, 'vi') || left.generation - right.generation,
    );
  const indexPages = chunk(indexEntries, indexPerPage);

  return {
    sheets: { text: textSheet, tree: geometry },
    treePageCount: treePages.length,
    generationCount: Math.max(1, ...generations.values()),
    pages: [
      { kind: 'cover', number: 1 },
      { kind: 'intro', number: 2 },
      ...contents.map<BookPage>((entries, index) => ({
        kind: 'contents',
        number: 3 + index,
        first: index === 0,
        columns: contentsColumns,
        entries,
      })),
      { kind: 'poster', number: posterPage },
      ...treePages,
      ...indexPages.map<BookPage>((entries, index) => ({
        kind: 'index',
        number: indexStart + index,
        first: index === 0,
        columns: indexColumns,
        entries,
      })),
    ],
  };
}
