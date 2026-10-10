import type { DesignerDraft, DesignerGender, DesignerMember } from './designer-model';

export type RelationshipKind = 'FATHER' | 'MOTHER' | 'WIFE' | 'SON' | 'DAUGHTER';

export type SpouseEntry = { member: DesignerMember; wifeOrder: number };

export type PlannedParents = { fatherId: string | null; motherId: string | null };

export function relationshipGender(kind: RelationshipKind): DesignerGender {
  return kind === 'FATHER' || kind === 'SON' ? 'MALE' : 'FEMALE';
}

export function isChildKind(kind: RelationshipKind): boolean {
  return kind === 'SON' || kind === 'DAUGHTER';
}

export function normalizedName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
}

export function wivesOf(draft: DesignerDraft, husbandId: string): SpouseEntry[] {
  return draft.relationships
    .filter((relationship) => relationship.husbandId === husbandId)
    .map((relationship) => ({
      member: draft.people.find((person) => person.id === relationship.wifeId),
      wifeOrder: relationship.wifeOrder,
    }))
    .filter((entry): entry is SpouseEntry => entry.member !== undefined)
    .sort((left, right) => left.wifeOrder - right.wifeOrder);
}

export function husbandsOf(draft: DesignerDraft, wifeId: string): DesignerMember[] {
  return draft.relationships
    .filter((relationship) => relationship.wifeId === wifeId)
    .sort((left, right) => left.wifeOrder - right.wifeOrder)
    .map((relationship) => draft.people.find((person) => person.id === relationship.husbandId))
    .filter((person): person is DesignerMember => person !== undefined);
}

export function nextWifeOrder(draft: DesignerDraft, husbandId: string): number {
  return (
    Math.max(
      0,
      ...draft.relationships
        .filter((relationship) => relationship.husbandId === husbandId)
        .map((relationship) => relationship.wifeOrder),
    ) + 1
  );
}

export function relationshipChoiceBlockedReason(
  kind: RelationshipKind,
  source: DesignerMember,
): string | null {
  if (kind === 'FATHER' && source.fatherId) return 'Person này đã có bố.';
  if (kind === 'MOTHER' && source.motherId) return 'Person này đã có mẹ.';

  if (kind === 'WIFE') {
    if (source.gender === 'FEMALE') {
      return 'Person này là nữ nên không thể thêm vợ (không hỗ trợ thêm chồng).';
    }
    if (source.gender !== 'MALE') {
      return 'Chỉ person nam mới có thể thêm vợ. Hãy cập nhật giới tính trước.';
    }
  }

  if (isChildKind(kind) && source.gender !== 'MALE' && source.gender !== 'FEMALE') {
    return 'Person chưa xác định giới tính Nam/Nữ nên chưa thể thêm con.';
  }

  return null;
}

export function plannedChildParents(
  draft: DesignerDraft,
  source: DesignerMember,
  chosenMotherId: string | null | undefined,
): PlannedParents {
  if (source.gender === 'FEMALE') {
    return {
      fatherId: husbandsOf(draft, source.id)[0]?.id ?? null,
      motherId: source.id,
    };
  }

  const wives = wivesOf(draft, source.id);
  return {
    fatherId: source.id,
    motherId:
      chosenMotherId !== undefined
        ? chosenMotherId
        : wives.length === 1
          ? wives[0]!.member.id
          : null,
  };
}

export function needsMotherChoice(
  draft: DesignerDraft,
  source: DesignerMember,
  kind: RelationshipKind,
): boolean {
  return isChildKind(kind) && source.gender === 'MALE' && wivesOf(draft, source.id).length > 1;
}

export function findDuplicatePair(draft: DesignerDraft): [DesignerMember, DesignerMember] | null {
  const couples = new Set(
    draft.relationships.map((relationship) =>
      coupleKey(relationship.husbandId, relationship.wifeId),
    ),
  );
  const seen = new Map<string, DesignerMember[]>();
  for (const person of draft.people) {
    if (!person.fatherId && !person.motherId) continue;
    const key = [normalizedName(person.name), person.fatherId ?? '', person.motherId ?? ''].join(
      '|',
    );
    const namesakes = seen.get(key) ?? [];
    const previous = namesakes.find((other) => !couples.has(coupleKey(other.id, person.id)));
    if (previous) return [previous, person];
    seen.set(key, [...namesakes, person]);
  }
  return null;
}

function coupleKey(leftId: string, rightId: string): string {
  return leftId < rightId ? leftId + '|' + rightId : rightId + '|' + leftId;
}
