'use client';

import { CalendarDays, Flower2, MapPin, Phone, ScrollText, UsersRound, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

import { PersonAvatar } from '@/components/ui/person-avatar';
import { familyMediaSrc } from '@/lib/media-api';
import { displayPersonTitle } from '@/lib/person-name';
import type { FamilyTreeRelationship, Gender, Person } from '@/types/family-tree';

const GENDER_LABEL: Record<Gender, string | null> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
  UNKNOWN: null,
};

const MARRIAGE_STATUS_LABEL: Record<FamilyTreeRelationship['status'], string | null> = {
  MARRIED: null,
  SEPARATED: 'đã ly thân',
  DIVORCED: 'đã ly hôn',
  WIDOWED: 'góa',
};

/** `YYYY-MM-DD…` as `DD/MM/YYYY`; anything else as given. */
function formatDate(value: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function byFamilyOrder(a: Person, b: Person): number {
  const order = (a.orderInFamily ?? Infinity) - (b.orderInFamily ?? Infinity);
  if (order !== 0 && Number.isFinite(order)) return order;
  return (a.birthDate ?? '9999').localeCompare(b.birthDate ?? '9999');
}

function hasParentsIn(person: Person, byId: ReadonlyMap<string, Person>): boolean {
  return Boolean(
    (person.fatherId && byId.has(person.fatherId)) ||
    (person.motherId && byId.has(person.motherId)),
  );
}

/**
 * "Con thứ N" for someone born into the family. Someone who married in (no
 * parents on the tree, but a spouse who has them) takes their spouse's place
 * instead: the wife of the first son is "Con dâu thứ 1", the husband of the
 * first daughter "Con rể thứ 1".
 */
function familyRoleLabel(
  person: Person,
  byId: ReadonlyMap<string, Person>,
  spouses: readonly { spouse: Person }[],
  isHusband: boolean,
): string | null {
  if (!hasParentsIn(person, byId)) {
    const bloodSpouse = spouses.find(({ spouse }) => hasParentsIn(spouse, byId))?.spouse;
    if (bloodSpouse) {
      const role = isHusband ? 'Con rể' : 'Con dâu';
      return bloodSpouse.orderInFamily ? `${role} thứ ${bloodSpouse.orderInFamily}` : role;
    }
  }
  return person.orderInFamily ? `Con thứ ${person.orderInFamily}` : null;
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5">
      <span className="mt-0.5 text-amber-700 [&_svg]:size-4" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-stone-500">{label}</dt>
        <dd className="text-sm font-medium text-stone-800">{value}</dd>
      </div>
    </div>
  );
}

function RelativeChip({
  person,
  note,
  onSelect,
}: {
  person: Person;
  note?: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(person.id)}
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-900/15 bg-white px-3 py-1.5 text-sm text-stone-800 transition hover:border-amber-700/50 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
    >
      {displayPersonTitle(person)}
      {note ? <span className="text-xs text-stone-500">({note})</span> : null}
    </button>
  );
}

/**
 * A person's details over the tree: names, dates, death anniversary, burial
 * place, biography and close relatives. Relatives open in the same popup.
 */
export function PersonDetailsDialog({
  person,
  generation,
  people,
  relationships,
  familySlug,
  onSelectPerson,
  onClose,
}: {
  person: Person;
  generation: number | null;
  people: readonly Person[];
  relationships: readonly FamilyTreeRelationship[];
  familySlug: string;
  onSelectPerson: (id: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const byId = new Map(people.map((entry) => [entry.id, entry]));

  useEffect(() => {
    closeRef.current?.focus();
  }, [person.id]);

  useEffect(() => {
    const close = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const father = person.fatherId ? byId.get(person.fatherId) : undefined;
  const mother = person.motherId ? byId.get(person.motherId) : undefined;
  const spouses = relationships
    .filter((link) => link.husbandId === person.id || link.wifeId === person.id)
    .sort((a, b) => (a.wifeOrder ?? Infinity) - (b.wifeOrder ?? Infinity))
    .flatMap((link) => {
      const spouse = byId.get(link.husbandId === person.id ? link.wifeId : link.husbandId);
      return spouse ? [{ spouse, note: MARRIAGE_STATUS_LABEL[link.status] }] : [];
    });
  const isHusband = relationships.some((link) => link.husbandId === person.id);
  const familyRole = familyRoleLabel(person, byId, spouses, isHusband);
  const children = people
    .filter((entry) => entry.fatherId === person.id || entry.motherId === person.id)
    .sort(byFamilyOrder);

  const genderLabel = GENDER_LABEL[person.gender];
  const birth = formatDate(person.birthDate);
  const death = formatDate(person.deathDate);
  const lunarAnniversary =
    person.lunarDeathDay && person.lunarDeathMonth
      ? `Ngày ${person.lunarDeathDay} tháng ${person.lunarDeathMonth} âm lịch`
      : null;
  const otherNames = [
    person.courtesyName ? `Tên tự: ${person.courtesyName}` : null,
    person.nickname ? `Tên thường gọi: ${person.nickname}` : null,
  ].filter(Boolean);

  const infoRows = [
    birth ? { key: 'birth', icon: <CalendarDays />, label: 'Ngày sinh', value: birth } : null,
    death ? { key: 'death', icon: <CalendarDays />, label: 'Ngày mất', value: death } : null,
    lunarAnniversary
      ? { key: 'anniversary', icon: <Flower2 />, label: 'Ngày giỗ', value: lunarAnniversary }
      : null,
    person.burialPlace
      ? { key: 'burial', icon: <MapPin />, label: 'Nơi an táng', value: person.burialPlace }
      : null,
    person.phone
      ? {
          key: 'phone',
          icon: <Phone />,
          label: 'Số điện thoại',
          value: (
            <a href={`tel:${person.phone}`} className="text-emerald-800 hover:underline">
              {person.phone}
            </a>
          ),
        }
      : null,
  ].filter((row) => row !== null);

  const hasRelatives = Boolean(father || mother || spouses.length > 0 || children.length > 0);

  return (
    <div className="fixed inset-0 z-[70] grid items-end p-0 sm:place-items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-stone-950/50 backdrop-blur-[2px]"
        aria-label="Đóng thông tin"
        tabIndex={-1}
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-details-name"
        className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-amber-900/15 bg-[#fffdf8] shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <header className="flex items-start gap-4 border-b border-amber-900/10 bg-gradient-to-b from-amber-50 to-[#fffdf8] px-5 pb-5 pt-6 sm:px-6">
          <div className="size-20 shrink-0 overflow-hidden rounded-2xl border-2 border-amber-700/30 bg-amber-100 shadow-sm">
            {person.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={familyMediaSrc(familySlug, person.avatarUrl)}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <PersonAvatar
                gender={person.gender}
                generation={generation}
                birthDate={person.birthDate}
                className="size-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <h2
              id="person-details-name"
              className="text-xl font-bold leading-tight text-[#3b2a0c] sm:text-2xl"
            >
              {displayPersonTitle(person)}
            </h2>
            {otherNames.length > 0 ? (
              <p className="mt-1 text-sm text-stone-600">{otherNames.join(' · ')}</p>
            ) : null}
            <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs font-medium">
              {generation ? (
                <span className="rounded-full bg-amber-800 px-2.5 py-1 text-amber-50">
                  Đời thứ {generation}
                </span>
              ) : null}
              {familyRole ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900">
                  {familyRole}
                </span>
              ) : null}
              {genderLabel ? (
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">
                  {genderLabel}
                </span>
              ) : null}
              <span
                className={
                  'rounded-full px-2.5 py-1 ' +
                  (person.isAlive
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-stone-200 text-stone-700')
                }
              >
                {person.isAlive ? 'Còn sống' : 'Đã mất'}
              </span>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="grid gap-6 overflow-y-auto px-5 py-5 sm:px-6">
          {infoRows.length > 0 ? (
            <dl className="grid divide-y divide-amber-900/10 sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0">
              {infoRows.map((row) => (
                <InfoRow key={row.key} icon={row.icon} label={row.label} value={row.value} />
              ))}
            </dl>
          ) : null}

          {hasRelatives ? (
            <section className="grid gap-3" aria-labelledby="person-details-relatives">
              <h3
                id="person-details-relatives"
                className="flex items-center gap-2 text-sm font-semibold text-emerald-950"
              >
                <UsersRound className="size-4 text-amber-700" aria-hidden="true" />
                Quan hệ gia đình
              </h3>
              <dl className="grid gap-3 text-sm">
                {father || mother ? (
                  <div className="grid gap-1.5">
                    <dt className="text-xs text-stone-500">Cha mẹ</dt>
                    <dd className="flex flex-wrap gap-2">
                      {father ? (
                        <RelativeChip person={father} note="cha" onSelect={onSelectPerson} />
                      ) : null}
                      {mother ? (
                        <RelativeChip person={mother} note="mẹ" onSelect={onSelectPerson} />
                      ) : null}
                    </dd>
                  </div>
                ) : null}
                {spouses.length > 0 ? (
                  <div className="grid gap-1.5">
                    <dt className="text-xs text-stone-500">{isHusband ? 'Vợ' : 'Chồng'}</dt>
                    <dd className="flex flex-wrap gap-2">
                      {spouses.map(({ spouse, note }) => (
                        <RelativeChip
                          key={spouse.id}
                          person={spouse}
                          note={note}
                          onSelect={onSelectPerson}
                        />
                      ))}
                    </dd>
                  </div>
                ) : null}
                {children.length > 0 ? (
                  <div className="grid gap-1.5">
                    <dt className="text-xs text-stone-500">Con ({children.length})</dt>
                    <dd className="flex flex-wrap gap-2">
                      {children.map((child) => (
                        <RelativeChip key={child.id} person={child} onSelect={onSelectPerson} />
                      ))}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          {person.biography ? (
            <section className="grid gap-2" aria-labelledby="person-details-biography">
              <h3
                id="person-details-biography"
                className="flex items-center gap-2 text-sm font-semibold text-emerald-950"
              >
                <ScrollText className="size-4 text-amber-700" aria-hidden="true" />
                Tiểu sử
              </h3>
              <p className="whitespace-pre-line text-sm leading-7 text-stone-700">
                {person.biography}
              </p>
            </section>
          ) : null}

          {infoRows.length === 0 && !hasRelatives && !person.biography ? (
            <p className="text-center text-sm text-stone-500">
              Chưa có thêm thông tin về người này.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
