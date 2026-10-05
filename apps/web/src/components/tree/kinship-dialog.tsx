'use client';

import { ArrowUpDown, ChevronRight, Info, UsersRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { findKinship, type KinshipGraph } from '@/lib/kinship';
import { displayPersonName } from '@/lib/person-name';
import type { PersonSearchEntry } from '@/lib/person-search';
import { PersonSearch } from '@/components/tree/person-search';

function PersonSlot({
  label,
  entry,
  entries,
  autoFocus,
  onChange,
}: {
  label: string;
  entry: PersonSearchEntry | undefined;
  entries: PersonSearchEntry[];
  autoFocus: boolean;
  onChange: (personId: string | null) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium text-stone-500">{label}</span>
      {entry ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-900/15 bg-white px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-stone-900">
              {displayPersonName(entry.person.name)}
            </p>
            <p className="truncate text-xs text-stone-500">
              Đời {entry.generation} · {entry.lifespan}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 rounded-lg px-2.5 py-1 text-sm font-medium text-amber-800 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
          >
            Đổi
          </button>
        </div>
      ) : (
        <PersonSearch
          tone="light"
          label={label}
          entries={entries}
          autoFocus={autoFocus}
          onSelect={onChange}
          onClear={() => onChange(null)}
        />
      )}
    </div>
  );
}

/** Pick two people and read how they are related and what they call each other. */
export function KinshipDialog({
  entries,
  graph,
  initialFromId,
  onClose,
}: {
  entries: PersonSearchEntry[];
  graph: KinshipGraph;
  initialFromId: string | null;
  onClose: () => void;
}) {
  const [fromId, setFromId] = useState<string | null>(initialFromId);
  const [toId, setToId] = useState<string | null>(null);
  const entriesById = useMemo(
    () => new Map(entries.map((entry) => [entry.person.id, entry])),
    [entries],
  );
  const from = fromId ? entriesById.get(fromId) : undefined;
  const to = toId ? entriesById.get(toId) : undefined;

  useEffect(() => {
    const close = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const forward = from && to ? findKinship(graph, from.person.id, to.person.id) : null;
  const backward = from && to ? findKinship(graph, to.person.id, from.person.id) : null;
  const notes = [...new Set([...(forward?.notes ?? []), ...(backward?.notes ?? [])])];
  const name = (id: string): string => {
    const person = graph.byId.get(id);
    return person ? displayPersonName(person.name) : '';
  };

  return (
    <div className="fixed inset-0 z-[70] grid items-end p-0 sm:place-items-center sm:p-4">
      <button
        type="button"
        className="ui-backdrop absolute inset-0 bg-stone-950/50 backdrop-blur-[2px]"
        aria-label="Đóng"
        tabIndex={-1}
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="kinship-title"
        className="ui-sheet-dialog relative flex max-h-[88%] w-full flex-col overflow-hidden rounded-t-3xl border border-amber-900/15 bg-[#fffdf8] shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <header className="flex items-center gap-2 border-b border-amber-900/10 bg-gradient-to-b from-amber-50 to-[#fffdf8] px-5 py-4 sm:px-6">
          <UsersRound className="size-5 text-amber-700" aria-hidden="true" />
          <h2 id="kinship-title" className="flex-1 text-lg font-bold text-[#3b2a0c]">
            Tính xưng hô
          </h2>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="grid gap-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-2">
            <PersonSlot
              label="Người thứ nhất"
              entry={from}
              entries={entries}
              autoFocus={!from}
              onChange={setFromId}
            />
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setFromId(toId);
                  setToId(fromId);
                }}
                disabled={!from && !to}
                aria-label="Đổi chỗ hai người"
                className="grid size-8 place-items-center rounded-full border border-amber-900/15 bg-white text-amber-800 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 disabled:opacity-40"
              >
                <ArrowUpDown className="size-4" aria-hidden="true" />
              </button>
            </div>
            <PersonSlot
              label="Người thứ hai"
              entry={to}
              entries={entries}
              autoFocus={Boolean(from) && !to}
              onChange={setToId}
            />
          </div>

          {from && to ? (
            from.person.id === to.person.id ? (
              <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
                Hai lựa chọn là cùng một người.
              </p>
            ) : forward && backward ? (
              <section className="grid gap-4" aria-live="polite">
                <p className="text-base leading-7 text-stone-700">
                  <strong className="text-stone-900">{name(to.person.id)}</strong> là{' '}
                  <strong className="text-[#8b1a1a]">{forward.relation}</strong> của{' '}
                  <strong className="text-stone-900">{name(from.person.id)}</strong>.
                </p>

                <dl className="grid gap-2 text-sm">
                  {[
                    {
                      speaker: from.person.id,
                      listener: to.person.id,
                      call: forward.term,
                      self: backward.term,
                    },
                    {
                      speaker: to.person.id,
                      listener: from.person.id,
                      call: backward.term,
                      self: forward.term,
                    },
                  ].map((row) => (
                    <div
                      key={row.speaker}
                      className="rounded-xl border border-amber-900/10 bg-amber-50/60 px-4 py-3"
                    >
                      <dt className="text-xs text-stone-500">
                        {name(row.speaker)} nói với {name(row.listener)}
                      </dt>
                      <dd className="mt-0.5 text-stone-800">
                        Gọi là <strong className="text-[#8b1a1a]">{row.call}</strong>, xưng{' '}
                        <strong className="text-[#8b1a1a]">{row.self}</strong>
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="grid gap-1.5">
                  <span className="text-xs font-medium text-stone-500">Đường quan hệ</span>
                  <ol className="flex flex-wrap items-center gap-1 text-sm">
                    {forward.path.map((id, index) => (
                      <li key={id} className="flex items-center gap-1">
                        {index > 0 ? (
                          <ChevronRight className="size-3.5 text-stone-400" aria-hidden="true" />
                        ) : null}
                        <span
                          className={
                            'rounded-full px-2.5 py-1 ' +
                            (id === forward.commonAncestorId
                              ? 'bg-amber-800 text-amber-50'
                              : 'bg-stone-100 text-stone-700')
                          }
                          title={
                            id === forward.commonAncestorId ? 'Tổ tiên chung gần nhất' : undefined
                          }
                        >
                          {name(id)}
                        </span>
                      </li>
                    ))}
                  </ol>
                  {forward.commonAncestorId ? (
                    <p className="text-xs text-stone-500">
                      Tổ tiên chung gần nhất: {name(forward.commonAncestorId)}
                    </p>
                  ) : null}
                </div>

                {notes.map((note) => (
                  <p
                    key={note}
                    className="flex gap-2 rounded-xl bg-amber-100/70 px-3 py-2 text-xs leading-5 text-amber-950"
                  >
                    <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {note}
                  </p>
                ))}
              </section>
            ) : (
              <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
                Chưa tìm thấy quan hệ huyết thống hay hôn nhân giữa hai người trên cây gia phả.
              </p>
            )
          ) : (
            <p className="text-sm text-stone-500">Chọn hai người để xem cách xưng hô.</p>
          )}
        </div>
      </section>
    </div>
  );
}
