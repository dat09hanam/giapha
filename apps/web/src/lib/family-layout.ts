import type { Gender } from '@/types/family-tree';

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
  rowForGeneration?: (generation: number) => RowDimensions;
  spouseGap: number;
  siblingGap: number;
  generationGap: number;
};

export type RowDimensions = Pick<LayoutDimensions, 'nodeWidth' | 'spouseGap' | 'siblingGap'>;

export const BRACKET_INSET = 36;

const BRACKET_DROP = 16;
const BRACKET_STEP = 12;
export const CHILD_BUS_OFFSET = 30;
export const CHILD_BUS_STEP = 12;

export type MarriageLink = {
  husbandId: string;
  wifeId: string;
  leftId: string;
  rightId: string;
  adjacent: boolean;
  drop: number;
};

export type ChildLink = {
  childId: string;
  sourceId: string;
  sourceHandle: 'spouse-source' | 'child-source';
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

export function sortMembers(left: LayoutPerson, right: LayoutPerson): number {
  return (
    left.generation - right.generation ||
    left.orderInFamily - right.orderInFamily ||
    left.name.localeCompare(right.name, 'vi')
  );
}

type ChildGroup = {
  key: string;
  junction: number;
  left: number;
  children: string[];
  offsets: number[];
};

// Horizontal extent a subtree occupies on each generation row, relative to its unit origin.
type Contour = Map<number, { left: number; right: number }>;

type UnitLayout = { contour: Contour; groups: ChildGroup[] };

function coupleKey(husbandId: string, wifeId: string): string {
  return husbandId + '|' + wifeId;
}

function extendContour(contour: Contour, generation: number, left: number, right: number): void {
  const existing = contour.get(generation);
  contour.set(
    generation,
    existing
      ? { left: Math.min(existing.left, left), right: Math.max(existing.right, right) }
      : { left, right },
  );
}

function mergeContour(target: Contour, source: Contour, offset: number): void {
  source.forEach((extent, generation) =>
    extendContour(target, generation, extent.left + offset, extent.right + offset),
  );
}

function mirrorContour(contour: Contour): Contour {
  return new Map(
    [...contour].map(([generation, extent]) => [
      generation,
      { left: -extent.right, right: -extent.left },
    ]),
  );
}

/** Smallest offset for `right` that keeps it clear of `left` on every shared generation row. */
function separation(left: Contour, right: Contour, gapFor: (generation: number) => number): number {
  if (left.size === 0) return Number.NEGATIVE_INFINITY;

  let offset = Number.NEGATIVE_INFINITY;
  right.forEach((extent, generation) => {
    const other = left.get(generation);
    if (other) offset = Math.max(offset, other.right + gapFor(generation) - extent.left);
  });
  if (Number.isFinite(offset)) return offset;

  const leftEdge = Math.max(...[...left.values()].map((extent) => extent.right));
  const rightEdge = Math.min(...[...right.values()].map((extent) => extent.left));
  return leftEdge + Math.min(...[...left.keys()].map(gapFor)) - rightEdge;
}

/**
 * Packs subtrees left to right as tightly as their contours allow. Packing from the left
 * alone bunches small subtrees against their left neighbour, so the result averages a
 * left-to-right and a right-to-left sweep; both satisfy every clearance, so the average does.
 */
function packContours(
  contours: readonly Contour[],
  gapFor: (generation: number) => number,
): number[] {
  function sweep(list: readonly Contour[]): number[] {
    const placed: Contour = new Map();
    return list.map((contour, index) => {
      const offset = index === 0 ? 0 : separation(placed, contour, gapFor);
      mergeContour(placed, contour, offset);
      return offset;
    });
  }

  const fromLeft = sweep(contours);
  const fromRight = sweep([...contours].reverse().map(mirrorContour))
    .map((offset) => -offset)
    .reverse();
  const last = contours.length - 1;
  return fromLeft.map(
    (offset, index) => (offset + fromRight[index]! - fromRight[last]! + fromLeft[last]!) / 2,
  );
}

function orderLinearMembers(
  members: readonly DesignerMember[],
  draft: DesignerDraft,
): DesignerMember[] {
  const membersById = new Map(members.map((member) => [member.id, member]));
  const dependentMemberIds = new Set(
    draft.relationships
      .filter(
        (relationship) =>
          membersById.has(relationship.husbandId) && membersById.has(relationship.wifeId),
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

export function layoutFamily(draft: LayoutInput, dimensions: LayoutDimensions): FamilyLayout {
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
    if (!membersById.has(relationship.husbandId) || !membersById.has(relationship.wifeId)) {
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
        Number(right.gender === 'MALE') - Number(left.gender === 'MALE') ||
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
    return parentId ? { key: 'single:' + parentId, junction: centerOffset(parentId) } : null;
  }

  const unitKeys = new Map<string, DesignerMember>();
  const childUnitIds = new Map<string, string[]>();
  arrangedUnits.forEach((members, unitId) => {
    const bloodMember = [...members]
      .sort(sortMembers)
      .find((member) =>
        [member.fatherId, member.motherId].some(
          (parentId) => parentId && membersById.has(parentId) && findUnit(parentId) !== unitId,
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

  function gapFor(generation: number): number {
    return (rowForGeneration?.(generation) ?? defaultRow).siblingGap;
  }

  function contourOf(unitId: string): Contour {
    return unitLayouts.get(unitId)!.contour;
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
        key: 'orphan',
        junction: ownWidth(unitId) / 2,
      };
      const existing = groupsByKey.get(group.key);
      if (existing) existing.children.push(childId);
      else groupsByKey.set(group.key, { ...group, left: 0, children: [childId], offsets: [] });
    });

    const groups = [...groupsByKey.values()].sort((left, right) => left.junction - right.junction);
    const groupContours = groups.map((group) => {
      group.offsets = packContours(group.children.map(contourOf), gapFor);
      const contour: Contour = new Map();
      group.children.forEach((childId, index) =>
        mergeContour(contour, contourOf(childId), group.offsets[index]!),
      );
      return contour;
    });

    // Centre each group's whole subtree (not just its top row) under its parents' junction, so
    // every ancestor stays on the centre line of its descendants; then push groups apart only
    // as far as their contours overlap.
    const placed: Contour = new Map();
    let displacement = 0;
    groups.forEach((group, index) => {
      const extents = [...groupContours[index]!.values()];
      const left = Math.min(...extents.map((extent) => extent.left));
      const right = Math.max(...extents.map((extent) => extent.right));
      const desired = group.junction - (left + right) / 2;
      group.left = Math.max(desired, separation(placed, groupContours[index]!, gapFor));
      displacement += group.left - desired;
      mergeContour(placed, groupContours[index]!, group.left);
    });
    const shift = groups.length > 0 ? displacement / groups.length : 0;
    groups.forEach((group) => {
      group.left -= shift;
    });

    const row = unitRow(unitId);
    const contour: Contour = new Map();
    arrangedUnits.get(unitId)!.forEach((member, index) => {
      const left = index * (row.nodeWidth + row.spouseGap);
      extendContour(contour, member.generation, left, left + row.nodeWidth);
    });
    groups.forEach((group, groupIndex) => {
      mergeContour(contour, groupContours[groupIndex]!, group.left);
      // Reserve the connector lines too, so another family's bus never runs through them.
      group.children.forEach((childId, index) => {
        const child = unitKeys.get(childId)!;
        const childCenter = group.left + group.offsets[index]! + centerOffset(child.id);
        const parentGeneration = arrangedUnits.get(unitId)![0]!.generation;
        for (
          let generation = parentGeneration + 1;
          generation < child.generation;
          generation += 1
        ) {
          extendContour(contour, generation, group.junction, group.junction);
        }
        extendContour(
          contour,
          child.generation,
          Math.min(group.junction, childCenter),
          Math.max(group.junction, childCenter),
        );
      });
    });
    unitLayouts.set(unitId, { contour, groups });
  }

  const hasParentUnit = new Set([...childUnitIds.values()].flat());
  const rootUnitIds = [...arrangedUnits.keys()]
    .filter((unitId) => !hasParentUnit.has(unitId))
    .sort(compareUnits);
  rootUnitIds.forEach((unitId) => {
    if (!claimedUnitIds.has(unitId)) measure(unitId);
  });
  [...arrangedUnits.keys()].sort(compareUnits).forEach((unitId) => {
    if (claimedUnitIds.has(unitId)) return;
    rootUnitIds.push(unitId);
    measure(unitId);
  });

  const positions = new Map<string, { x: number; y: number }>();

  function place(unitId: string, origin: number): void {
    const layout = unitLayouts.get(unitId)!;
    const row = unitRow(unitId);
    arrangedUnits.get(unitId)!.forEach((member, index) => {
      positions.set(member.id, {
        x: origin + index * (row.nodeWidth + row.spouseGap),
        y: (member.generation - 1) * GENERATION_GAP,
      });
    });

    layout.groups.forEach((group) =>
      group.children.forEach((childId, index) =>
        place(childId, origin + group.left + group.offsets[index]!),
      ),
    );
  }

  const rootOffsets = packContours(rootUnitIds.map(contourOf), gapFor);
  const forest: Contour = new Map();
  rootUnitIds.forEach((unitId, index) =>
    mergeContour(forest, contourOf(unitId), rootOffsets[index]!),
  );
  const extents = [...forest.values()];
  const forestCenter =
    extents.length > 0
      ? (Math.min(...extents.map((extent) => extent.left)) +
          Math.max(...extents.map((extent) => extent.right))) /
        2
      : 0;
  rootUnitIds.forEach((unitId, index) => place(unitId, rootOffsets[index]! - forestCenter));

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

    const busOffset = CHILD_BUS_OFFSET + CHILD_BUS_STEP * ((groupIndexes.get(group.key) ?? 0) % 3);
    const couple = couples.get(group.key);
    if (!couple) {
      return [
        {
          childId: child.id,
          sourceId: group.key.slice('single:'.length),
          sourceHandle: 'child-source' as const,
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
            sourceHandle: 'spouse-source' as const,
            offsetX: unitRow(findUnit(leftId)).spouseGap / 2,
            offsetY: 0,
            busOffset,
          }
        : {
            childId: child.id,
            sourceId: leftId,
            sourceHandle: 'child-source' as const,
            offsetX: (centerOffset(rightId) - centerOffset(leftId)) / 2,
            offsetY: drop,
            busOffset,
          },
    ];
  });

  return { positions, marriages, childLinks };
}

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
    if (peopleById.has(relationship.husbandId) && peopleById.has(relationship.wifeId)) {
      joinGroups(relationship.husbandId, relationship.wifeId);
    }
  });
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
  const queue = [...groupIds].filter((groupId) => (indegrees.get(groupId) ?? 0) === 0);
  const originalRoots = new Set(queue);
  queue.forEach((groupId) => generations.set(groupId, 1));

  for (let index = 0; index < queue.length; index += 1) {
    const groupId = queue[index]!;
    const generation = generations.get(groupId) ?? 1;

    (childGroups.get(groupId) ?? new Set<string>()).forEach((childGroup) => {
      generations.set(childGroup, Math.max(generations.get(childGroup) ?? 1, generation + 1));
      const remainingParents = (indegrees.get(childGroup) ?? 1) - 1;
      indegrees.set(childGroup, remainingParents);
      if (remainingParents === 0) queue.push(childGroup);
    });
  }

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
        .reduce((lowest, person) => Math.min(lowest, person.generation), Number.MAX_SAFE_INTEGER);
      generations.set(
        groupId,
        Number.isFinite(existingGeneration) ? Math.max(1, existingGeneration) : 1,
      );
    }
  });

  return new Map(
    draft.people.map((person) => [person.id, generations.get(findGroup(person.id)) ?? 1]),
  );
}
