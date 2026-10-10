export type ScopePerson = { id: string; fatherId: string | null; motherId: string | null };
export type ScopeRelationship = { husbandId: string; wifeId: string };

export type TreeEditScope = { fullAccess: boolean; rootPersonIds: string[] };

export type BranchScope = {
  lineage: Set<string>;
  editable: Set<string>;
};
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
