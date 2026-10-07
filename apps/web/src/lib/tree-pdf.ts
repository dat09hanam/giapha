import { downloadDesignerPdf } from '@/lib/designer-pdf';
import { computeGenerations, layoutFamily } from '@/lib/family-layout';
import { familyEdges } from '@/lib/tree-layout';
import { familyMediaSrc } from '@/lib/media-api';
import type { DesignerMember } from '@/components/tree/designer-model';
import type { FamilyTreeResponse } from '@/types/family-tree';

/** A branch includes the root's descendants and their spouses, but not spouses' ancestors. */
export function treeBranchIds(tree: FamilyTreeResponse, rootId: string): Set<string> {
  const lineage = new Set<string>();
  if (!tree.people.some((person) => person.id === rootId)) return lineage;
  lineage.add(rootId);
  let changed = true;
  while (changed) {
    changed = false;
    for (const person of tree.people) {
      if (
        !lineage.has(person.id) &&
        ((person.fatherId && lineage.has(person.fatherId)) ||
          (person.motherId && lineage.has(person.motherId)))
      ) {
        lineage.add(person.id);
        changed = true;
      }
    }
  }
  const ids = new Set(lineage);
  for (const relationship of tree.relationships) {
    if (lineage.has(relationship.husbandId)) ids.add(relationship.wifeId);
    if (lineage.has(relationship.wifeId)) ids.add(relationship.husbandId);
  }
  return ids;
}

export async function downloadTreePdf(
  tree: FamilyTreeResponse,
  familySlug: string,
  rootId: string,
): Promise<void> {
  const ids = rootId
    ? treeBranchIds(tree, rootId)
    : new Set(tree.people.map((person) => person.id));
  const people = tree.people.filter((person) => ids.has(person.id));
  const generations = computeGenerations(
    people.map((person) => ({
      ...person,
      generation: person.generation ?? 1,
      orderInFamily: person.orderInFamily ?? 0,
    })),
    tree.relationships
      .filter((relationship) => ids.has(relationship.husbandId) && ids.has(relationship.wifeId))
      .map((relationship) => ({ ...relationship, wifeOrder: relationship.wifeOrder ?? 1 })),
  );
  const members: DesignerMember[] = people.map((person) => ({
    ...person,
    databaseId: person.id,
    honorific: person.honorific ?? '',
    nickname: person.nickname ?? '',
    courtesyName: person.courtesyName ?? '',
    birthDate: person.birthDate ?? '',
    deathDate: person.deathDate ?? '',
    lunarDeathAnniversary: '',
    burialPlace: person.burialPlace ?? '',
    phone: person.phone ?? '',
    avatarUrl: person.avatarUrl ?? '',
    biography: person.biography ?? '',
    fatherId: person.fatherId && ids.has(person.fatherId) ? person.fatherId : null,
    motherId: person.motherId && ids.has(person.motherId) ? person.motherId : null,
    generation: generations.get(person.id) ?? 1,
    orderInFamily: person.orderInFamily ?? 0,
    deletesBranch: false,
  }));
  const relationships = tree.relationships
    .filter((relationship) => ids.has(relationship.husbandId) && ids.has(relationship.wifeId))
    .map((relationship) => ({ ...relationship, wifeOrder: relationship.wifeOrder ?? 1 }));
  const layout = layoutFamily(
    { people: members, relationships },
    { nodeWidth: 214, spouseGap: 70, siblingGap: 48, generationGap: 320 },
  );
  const root = people.find((person) => person.id === rootId);
  await downloadDesignerPdf(
    members.map((member) => ({
      id: member.id,
      position: layout.positions.get(member.id) ?? { x: 0, y: 0 },
      measured: { width: 214, height: 210 },
      data: {
        member,
        spouseLabel: null,
        avatarSrc: member.avatarUrl ? familyMediaSrc(familySlug, member.avatarUrl) : null,
      },
    })),
    familyEdges(layout, { stroke: '#9a6b2f' }),
    tree.family.name,
    familySlug,
    root ? `Nhánh: ${root.name}` : 'Toàn bộ cây',
  );
}
