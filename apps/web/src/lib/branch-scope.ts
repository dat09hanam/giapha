export type ScopePerson = { id: string; fatherId: string | null; motherId: string | null };
export type ScopeRelationship = { husbandId: string; wifeId: string };

/** Who may edit what in the designer: everything, or the chi/nhánh rooted at these people. */
export type TreeEditScope = { fullAccess: boolean; rootPersonIds: string[] };

export type BranchScope = {
  /** The roots and every descendant through either parent. */
  lineage: Set<string>;
  /** The lineage plus the spouses married into it: everyone a branch manager may edit. */
  editable: Set<string>;
};
/**
 * The people a chi/nhánh covers. Spouses are editable but do not extend the branch, so a man who
 * married in does not bring children from another marriage with him.
 *
 * Mirrors `apps/api/src/branches/branch-scope.ts`, which enforces it; change both together.
 */
export function computeBranchScope(
  people: readonly ScopePerson[],
  relationships: readonly ScopeRelationship[],
  rootIds: Iterable<string>,
): BranchScope {
  const childrenOf = new Map<string, string[]>();
  for (const person of people) {
    for (const parentId of [person.fatherId, person.motherId]) {
      if (!parentId) continue;
      const children = childrenOf.get(parentId) ?? [];
      children.push(person.id);
      childrenOf.set(parentId, children);
    }
  }

  const known = new Set(people.map((person) => person.id));
  const lineage = new Set<string>();
  const pending = [...rootIds].filter((id) => known.has(id));
  while (pending.length) {
    const id = pending.pop()!;
    if (lineage.has(id)) continue;
    lineage.add(id);
    pending.push(...(childrenOf.get(id) ?? []));
  }

  const editable = new Set(lineage);
  for (const relationship of relationships) {
    if (lineage.has(relationship.husbandId)) editable.add(relationship.wifeId);
    if (lineage.has(relationship.wifeId)) editable.add(relationship.husbandId);
  }
  return { lineage, editable };
}
