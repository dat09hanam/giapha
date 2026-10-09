import type { Gender } from "@/types/family-tree";

/** The fields of a person the family layout needs; designer and viewer both fit it. */
export type LayoutPerson = {
  id: string;
  name: string;
  gender: Gender;
  fatherId: string | null;
  motherId: string | null;
  generation: number;
  orderInFamily: number;
};

export type LayoutRelationship = {
  husbandId: string;
  wifeId: string;
  wifeOrder: number;
};

export type LayoutInput = {
  people: readonly LayoutPerson[];
  relationships: readonly LayoutRelationship[];
};

export type LayoutDimensions = {
  nodeWidth: number;
  /** Optional card width and gaps per generation row; defaults to the above. */
  rowForGeneration?: (generation: number) => RowDimensions;
  spouseGap: number;
  siblingGap: number;
  generationGap: number;
};

export type RowDimensions = Pick<LayoutDimensions, "nodeWidth" | "spouseGap" | "siblingGap">;

/** Horizontal inset of a marriage bracket drawn below non-adjacent spouses. */
export const BRACKET_INSET = 36;

const BRACKET_DROP = 16;
const BRACKET_STEP = 12;
export const CHILD_BUS_OFFSET = 30;
/** Neighbouring sibling groups' buses step apart by this much so they never merge. */
export const CHILD_BUS_STEP = 12;

/** A drawn marriage line between two people standing in the same row. */
export type MarriageLink = {
  husbandId: string;
  wifeId: string;
  leftId: string;
  rightId: string;
  /** Adjacent spouses get a straight line; others a bracket below the row. */
  adjacent: boolean;
  drop: number;
};

/** A line from the middle of a couple's marriage line (or one parent) to a child. */
export type ChildLink = {
  childId: string;
  sourceId: string;
  sourceHandle: "spouse-source" | "child-source";
  offsetX: number;
  offsetY: number;
  busOffset: number;
};

export type FamilyLayout = {
  positions: Map<string, { x: number; y: number }>;
  marriages: MarriageLink[];
  childLinks: ChildLink[];
};

type Couple = {
  key: string;
  husbandId: string;
  wifeId: string;
  married: boolean;
  order: number;
};

type DesignerMember = LayoutPerson;
type DesignerDraft = LayoutInput;

/** Birth order within a row: generation, then order in the family, then name. */
export function sortMembers(left: LayoutPerson, right: LayoutPerson): number {
  return (
    left.generation - right.generation ||
    left.orderInFamily - right.orderInFamily ||
    left.name.localeCompare(right.name, "vi")
  );
}

type ChildGroup = { key: string; junction: number; left: number; children: string[] };

type UnitLayout = { minX: number; width: number; groups: ChildGroup[] };

function coupleKey(husbandId: string, wifeId: string): string {
  return husbandId + "|" + wifeId;
}

/** Orders a spouse group when it is not a simple one-center star. */
function orderLinearMembers(
  members: readonly DesignerMember[],
  draft: DesignerDraft,
): DesignerMember[] {
  const membersById = new Map(members.map((member) => [member.id, member]));
  const dependentMemberIds = new Set(
    draft.relationships
      .filter(
        (relationship) =>
          membersById.has(relationship.husbandId) &&
          membersById.has(relationship.wifeId),
      )
      .map((relationship) => relationship.wifeId),
  );
  const visited = new Set<string>();
  const ordered: DesignerMember[] = [];

  function append(member: DesignerMember): void {
    if (visited.has(member.id)) return;
    ordered.push(member);
    visited.add(member.id);
    draft.relationships
      .filter((relationship) => relationship.husbandId === member.id)
      .sort((left, right) => left.wifeOrder - right.wifeOrder)
      .forEach((relationship) => {
        const wife = membersById.get(relationship.wifeId);
        if (wife) append(wife);
      });
  }

  const sorted = [...members].sort(sortMembers);
  sorted.filter((member) => !dependentMemberIds.has(member.id)).forEach(append);
  sorted.forEach(append);
  return ordered;
}

/**
 * Lays the tree out branch by branch. Spouses (and co-parents) form a unit that
 * stands in one row; each couple's children are grouped under the middle of
 * that couple's marriage line, and every unit reserves its descendants' width.
 */
export function layoutFamily(
  draft: LayoutInput,
  dimensions: LayoutDimensions,
): FamilyLayout {
  const {
    nodeWidth: NODE_WIDTH,
    spouseGap: SPOUSE_GAP,
    siblingGap: SIBLING_GAP,
    generationGap: GENERATION_GAP,
    rowForGeneration,
  } = dimensions;
  const defaultRow: RowDimensions = {
    nodeWidth: NODE_WIDTH,
    spouseGap: SPOUSE_GAP,
    siblingGap: SIBLING_GAP,
  };
  const membersById = new Map(draft.people.map((member) => [member.id, member]));
  const unitParents = new Map(draft.people.map((member) => [member.id, member.id]));

  function findUnit(memberId: string): string {
    const parentId = unitParents.get(memberId) ?? memberId;
    if (parentId === memberId) return memberId;

    const rootId = findUnit(parentId);
    unitParents.set(memberId, rootId);
    return rootId;
  }

  function join(leftId: string, rightId: string): void {
    const leftUnit = findUnit(leftId);
    const rightUnit = findUnit(rightId);
    if (leftUnit !== rightUnit) unitParents.set(rightUnit, leftUnit);
  }

  const couples = new Map<string, Couple>();
  draft.relationships.forEach((relationship) => {
    if (
      !membersById.has(relationship.husbandId) ||
      !membersById.has(relationship.wifeId)
    ) {
      return;
    }
    join(relationship.husbandId, relationship.wifeId);
    couples.set(coupleKey(relationship.husbandId, relationship.wifeId), {
      key: coupleKey(relationship.husbandId, relationship.wifeId),
      husbandId: relationship.husbandId,
      wifeId: relationship.wifeId,
      married: true,
      order: relationship.wifeOrder,
    });
  });
  // Parents of the same child stand together even without a saved marriage.
  draft.people.forEach((child) => {
    if (
      !child.fatherId ||
      !child.motherId ||
      !membersById.has(child.fatherId) ||
      !membersById.has(child.motherId)
    ) {
      return;
    }
    join(child.fatherId, child.motherId);
    const key = coupleKey(child.fatherId, child.motherId);
    if (!couples.has(key)) {
      couples.set(key, {
        key,
        husbandId: child.fatherId,
        wifeId: child.motherId,
        married: false,
        order: Number.MAX_SAFE_INTEGER,
      });
    }
  });

  const unitMembers = new Map<string, DesignerMember[]>();
  draft.people.forEach((member) => {
    const unitId = findUnit(member.id);
    unitMembers.set(unitId, [...(unitMembers.get(unitId) ?? []), member]);
  });
  const unitCouples = new Map<string, Couple[]>();
  couples.forEach((couple) => {
    const unitId = findUnit(couple.husbandId);
    unitCouples.set(unitId, [...(unitCouples.get(unitId) ?? []), couple]);
  });

  /** Star units put the shared spouse in the middle: Vợ 1 right, Vợ 2 left, ... */
  function arrangeUnit(unitId: string): DesignerMember[] {
    const members = unitMembers.get(unitId)!;
    const unitCoupleList = [...(unitCouples.get(unitId) ?? [])].sort(
      (left, right) => left.order - right.order || left.key.localeCompare(right.key),
    );
    if (unitCoupleList.length === 0) return members;

    const partnerCounts = new Map<string, number>();
    unitCoupleList.forEach((couple) => {
      partnerCounts.set(couple.husbandId, (partnerCounts.get(couple.husbandId) ?? 0) + 1);
      partnerCounts.set(couple.wifeId, (partnerCounts.get(couple.wifeId) ?? 0) + 1);
    });
    const center = [...members].sort(
      (left, right) =>
        (partnerCounts.get(right.id) ?? 0) - (partnerCounts.get(left.id) ?? 0) ||
        Number(right.gender === "MALE") - Number(left.gender === "MALE") ||
        sortMembers(left, right),
    )[0]!;
    const isStar = unitCoupleList.every(
      (couple) => couple.husbandId === center.id || couple.wifeId === center.id,
    );
    if (!isStar) return orderLinearMembers(members, draft);

    const leftSide: DesignerMember[] = [];
    const rightSide: DesignerMember[] = [];
    unitCoupleList.forEach((couple, index) => {
      const partner = membersById.get(
        couple.husbandId === center.id ? couple.wifeId : couple.husbandId,
      )!;
      (index % 2 === 0 ? rightSide : leftSide).push(partner);
    });
    return [...leftSide.reverse(), center, ...rightSide];
  }

  const arrangedUnits = new Map(
    [...unitMembers.keys()].map((unitId) => [unitId, arrangeUnit(unitId)]),
  );
  const memberIndex = new Map<string, number>();
  arrangedUnits.forEach((members) =>
    members.forEach((member, index) => memberIndex.set(member.id, index)),
  );

  /** Spouses share a row, so a whole unit uses its first member's row sizes. */
  function unitRow(unitId: string): RowDimensions {
    const generation = arrangedUnits.get(unitId)?.[0]?.generation ?? 1;
    return rowForGeneration?.(generation) ?? defaultRow;
  }

  function centerOffset(memberId: string): number {
    const row = unitRow(findUnit(memberId));
    return (memberIndex.get(memberId) ?? 0) * (row.nodeWidth + row.spouseGap) + row.nodeWidth / 2;
  }

  const coupleDrops = new Map<string, number>();
  unitCouples.forEach((unitCoupleList) => {
    let bracketCount = 0;
    [...unitCoupleList]
      .sort((left, right) => left.order - right.order)
      .forEach((couple) => {
        const distance = Math.abs(
          (memberIndex.get(couple.husbandId) ?? 0) - (memberIndex.get(couple.wifeId) ?? 0),
        );
        if (distance > 1) {
          coupleDrops.set(couple.key, BRACKET_DROP + BRACKET_STEP * bracketCount);
          bracketCount += 1;
        }
      });
  });

  /** Which child group of the parents' unit a person belongs to. */
  function childGroupKey(child: DesignerMember): { key: string; junction: number } | null {
    const fatherId = child.fatherId && membersById.has(child.fatherId) ? child.fatherId : null;
    const motherId = child.motherId && membersById.has(child.motherId) ? child.motherId : null;
    if (fatherId && motherId && couples.has(coupleKey(fatherId, motherId))) {
      return {
        key: coupleKey(fatherId, motherId),
        junction: (centerOffset(fatherId) + centerOffset(motherId)) / 2,
      };
    }
    const parentId = fatherId ?? motherId;
    return parentId ? { key: "single:" + parentId, junction: centerOffset(parentId) } : null;
  }

  // The unit member born into the tree decides which parents the unit hangs under.
  const unitKeys = new Map<string, DesignerMember>();
  const childUnitIds = new Map<string, string[]>();
  arrangedUnits.forEach((members, unitId) => {
    const bloodMember = [...members].sort(sortMembers).find((member) =>
      [member.fatherId, member.motherId].some(
        (parentId) =>
          parentId && membersById.has(parentId) && findUnit(parentId) !== unitId,
      ),
    );
    unitKeys.set(unitId, bloodMember ?? members[0]!);
    if (!bloodMember) return;

    const parentId =
      bloodMember.fatherId &&
      membersById.has(bloodMember.fatherId) &&
      findUnit(bloodMember.fatherId) !== unitId
        ? bloodMember.fatherId
        : bloodMember.motherId!;
    const parentUnitId = findUnit(parentId);
    childUnitIds.set(parentUnitId, [...(childUnitIds.get(parentUnitId) ?? []), unitId]);
  });

  function compareUnits(left: string, right: string): number {
    return sortMembers(unitKeys.get(left)!, unitKeys.get(right)!);
  }

  function ownWidth(unitId: string): number {
    const count = arrangedUnits.get(unitId)?.length ?? 1;
    const row = unitRow(unitId);
    return count * row.nodeWidth + Math.max(0, count - 1) * row.spouseGap;
  }

  const claimedUnitIds = new Set<string>();
  const unitLayouts = new Map<string, UnitLayout>();

  /** Gap between sibling units, taken from the row they stand in. */
  function siblingGapOf(children: readonly string[]): number {
    return children[0] ? unitRow(children[0]).siblingGap : SIBLING_GAP;
  }

  function spanWidth(children: string[]): number {
    return (
      children.reduce((total, childId) => total + unitLayouts.get(childId)!.width, 0) +
      Math.max(0, children.length - 1) * siblingGapOf(children)
    );
  }

  function measure(unitId: string): void {
    claimedUnitIds.add(unitId);
    const children = (childUnitIds.get(unitId) ?? [])
      .filter((childId) => !claimedUnitIds.has(childId))
      .sort(compareUnits);
    children.forEach((childId) => claimedUnitIds.add(childId));
    children.forEach(measure);

    const groupsByKey = new Map<string, ChildGroup>();
    children.forEach((childId) => {
      const group = childGroupKey(unitKeys.get(childId)!) ?? {
        key: "orphan",
        junction: ownWidth(unitId) / 2,
      };
      const existing = groupsByKey.get(group.key);
      if (existing) existing.children.push(childId);
      else groupsByKey.set(group.key, { ...group, left: 0, children: [childId] });
    });

    // Center each couple's children under it, then push apart any overlap and
    // shift the row back so the pushes do not drag the branch to one side.
    const groups = [...groupsByKey.values()].sort(
      (left, right) => left.junction - right.junction,
    );
    let previousRight = Number.NEGATIVE_INFINITY;
    let displacement = 0;
    groups.forEach((group) => {
      const width = spanWidth(group.children);
      const desired = group.junction - width / 2;
      group.left = Math.max(desired, previousRight + siblingGapOf(group.children));
      displacement += group.left - desired;
      previousRight = group.left + width;
    });
    const shift = groups.length > 0 ? displacement / groups.length : 0;
    groups.forEach((group) => {
      group.left -= shift;
    });

    const minX = Math.min(0, ...groups.map((group) => group.left));
    const maxX = Math.max(
      ownWidth(unitId),
      ...groups.map((group) => group.left + spanWidth(group.children)),
    );
    unitLayouts.set(unitId, { minX, width: maxX - minX, groups });
  }

  const hasParentUnit = new Set([...childUnitIds.values()].flat());
  const rootUnitIds = [...arrangedUnits.keys()]
    .filter((unitId) => !hasParentUnit.has(unitId))
    .sort(compareUnits);
  rootUnitIds.forEach((unitId) => {
    if (!claimedUnitIds.has(unitId)) measure(unitId);
  });
  // Units caught in an inconsistent parent cycle still need a place on the canvas.
  [...arrangedUnits.keys()].sort(compareUnits).forEach((unitId) => {
    if (claimedUnitIds.has(unitId)) return;
    rootUnitIds.push(unitId);
    measure(unitId);
  });

  const positions = new Map<string, { x: number; y: number }>();

  function place(unitId: string, left: number): void {
    const layout = unitLayouts.get(unitId)!;
    const origin = left - layout.minX;
    const row = unitRow(unitId);
    arrangedUnits.get(unitId)!.forEach((member, index) => {
      positions.set(member.id, {
        x: origin + index * (row.nodeWidth + row.spouseGap),
        y: (member.generation - 1) * GENERATION_GAP,
      });
    });

    layout.groups.forEach((group) => {
      let childLeft = origin + group.left;
      group.children.forEach((childId) => {
        place(childId, childLeft);
        childLeft += unitLayouts.get(childId)!.width + siblingGapOf(group.children);
      });
    });
  }

  const totalWidth =
    rootUnitIds.reduce((total, unitId) => total + unitLayouts.get(unitId)!.width, 0) +
    Math.max(0, rootUnitIds.length - 1) * SIBLING_GAP;
  let rootLeft = -totalWidth / 2;
  rootUnitIds.forEach((unitId) => {
    place(unitId, rootLeft);
    rootLeft += unitLayouts.get(unitId)!.width + SIBLING_GAP;
  });

  function sides(couple: Couple): { leftId: string; rightId: string } {
    return (memberIndex.get(couple.husbandId) ?? 0) <= (memberIndex.get(couple.wifeId) ?? 0)
      ? { leftId: couple.husbandId, rightId: couple.wifeId }
      : { leftId: couple.wifeId, rightId: couple.husbandId };
  }

  const marriages: MarriageLink[] = [...couples.values()]
    .filter((couple) => couple.married)
    .map((couple) => ({
      husbandId: couple.husbandId,
      wifeId: couple.wifeId,
      ...sides(couple),
      adjacent: !coupleDrops.has(couple.key),
      drop: coupleDrops.get(couple.key) ?? 0,
    }));

  const groupIndexes = new Map<string, number>();
  unitLayouts.forEach((layout) =>
    layout.groups.forEach((group, index) => groupIndexes.set(group.key, index)),
  );

  const childLinks: ChildLink[] = draft.people.flatMap((child) => {
    const group = childGroupKey(child);
    if (!group) return [];

    const busOffset =
      CHILD_BUS_OFFSET + CHILD_BUS_STEP * ((groupIndexes.get(group.key) ?? 0) % 3);
    const couple = couples.get(group.key);
    if (!couple) {
      return [
        {
          childId: child.id,
          sourceId: group.key.slice("single:".length),
          sourceHandle: "child-source" as const,
          offsetX: 0,
          offsetY: 0,
          busOffset,
        },
      ];
    }

    const { leftId, rightId } = sides(couple);
    const drop = coupleDrops.get(couple.key);
    return [
      drop === undefined
        ? {
          childId: child.id,
          sourceId: leftId,
          sourceHandle: "spouse-source" as const,
          offsetX: unitRow(findUnit(leftId)).spouseGap / 2,
          offsetY: 0,
          busOffset,
        }
        : {
          childId: child.id,
          sourceId: leftId,
          sourceHandle: "child-source" as const,
          offsetX: (centerOffset(rightId) - centerOffset(leftId)) / 2,
          offsetY: drop,
          busOffset,
        },
    ];
  });

  return { positions, marriages, childLinks };
}

/**
 * Generation (1-based row) of every person. Spouses and co-parents share a row,
 * children sit below all their parents, and a parent-less ancestor added above
 * someone deep in the tree is seated just above its nearest child.
 */
export function computeGenerations(
  people: readonly LayoutPerson[],
  relationships: readonly LayoutRelationship[],
): Map<string, number> {
  const draft = { people, relationships };
  const peopleById = new Map(draft.people.map((person) => [person.id, person]));
  const groupParents = new Map(draft.people.map((person) => [person.id, person.id]));

  function findGroup(memberId: string): string {
    const parentId = groupParents.get(memberId) ?? memberId;
    if (parentId === memberId) return memberId;

    const rootId = findGroup(parentId);
    groupParents.set(memberId, rootId);
    return rootId;
  }

  function joinGroups(leftId: string, rightId: string): void {
    const leftRoot = findGroup(leftId);
    const rightRoot = findGroup(rightId);
    if (leftRoot !== rightRoot) groupParents.set(rightRoot, leftRoot);
  }

  draft.relationships.forEach((relationship) => {
    if (
      peopleById.has(relationship.husbandId) &&
      peopleById.has(relationship.wifeId)
    ) {
      joinGroups(relationship.husbandId, relationship.wifeId);
    }
  });
  // A father and mother always share a row, even without a saved marriage.
  draft.people.forEach((person) => {
    if (
      person.fatherId &&
      person.motherId &&
      peopleById.has(person.fatherId) &&
      peopleById.has(person.motherId)
    ) {
      joinGroups(person.fatherId, person.motherId);
    }
  });

  const groupIds = new Set(draft.people.map((person) => findGroup(person.id)));
  const childGroups = new Map<string, Set<string>>();
  const indegrees = new Map([...groupIds].map((groupId) => [groupId, 0]));

  draft.people.forEach((person) => {
    const childGroup = findGroup(person.id);
    [person.fatherId, person.motherId].forEach((parentId) => {
      if (!parentId || !peopleById.has(parentId)) return;

      const parentGroup = findGroup(parentId);
      if (parentGroup === childGroup) return;

      const children = childGroups.get(parentGroup) ?? new Set<string>();
      if (children.has(childGroup)) return;

      children.add(childGroup);
      childGroups.set(parentGroup, children);
      indegrees.set(childGroup, (indegrees.get(childGroup) ?? 0) + 1);
    });
  });

  const generations = new Map<string, number>();
  const queue = [...groupIds].filter(
    (groupId) => (indegrees.get(groupId) ?? 0) === 0,
  );
  const originalRoots = new Set(queue);
  queue.forEach((groupId) => generations.set(groupId, 1));

  for (let index = 0; index < queue.length; index += 1) {
    const groupId = queue[index]!;
    const generation = generations.get(groupId) ?? 1;

    (childGroups.get(groupId) ?? new Set<string>()).forEach((childGroup) => {
      generations.set(
        childGroup,
        Math.max(generations.get(childGroup) ?? 1, generation + 1),
      );
      const remainingParents = (indegrees.get(childGroup) ?? 1) - 1;
      indegrees.set(childGroup, remainingParents);
      if (remainingParents === 0) queue.push(childGroup);
    });
  }

  // A parent added above someone deep in the tree (an in-law's father, say)
  // has no ancestors of its own; seat it one row above its nearest child.
  for (let index = queue.length - 1; index >= 0; index -= 1) {
    const groupId = queue[index]!;
    if (!originalRoots.has(groupId)) continue;
    const children = [...(childGroups.get(groupId) ?? new Set<string>())];
    if (children.length === 0) continue;
    const nearestChild = Math.min(
      ...children.map((childGroup) => generations.get(childGroup) ?? 1),
    );
    generations.set(groupId, Math.max(1, nearestChild - 1));
  }

  groupIds.forEach((groupId) => {
    if (!generations.has(groupId)) {
      const existingGeneration = draft.people
        .filter((person) => findGroup(person.id) === groupId)
        .reduce(
          (lowest, person) => Math.min(lowest, person.generation),
          Number.MAX_SAFE_INTEGER,
        );
      generations.set(
        groupId,
        Number.isFinite(existingGeneration) ? Math.max(1, existingGeneration) : 1,
      );
    }
  });

  return new Map(
    draft.people.map((person) => [
      person.id,
      generations.get(findGroup(person.id)) ?? 1,
    ]),
  );
}

