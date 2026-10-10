'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { Search, X } from 'lucide-react';

import { searchPeople, type PersonSearchEntry, type PersonSearchResult } from '@/lib/person-search';
import { displayPersonName } from '@/lib/person-name';
import { cn } from '@/lib/utils';

const MAX_RESULTS = 8;

const TONES = {
  page: {
    input:
      'border-transparent bg-white text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-brand-400 focus:ring-brand-400/30 sm:border-line',
    clear: 'text-stone-400 hover:bg-stone-100 hover:text-stone-800',
    list: 'absolute inset-x-0 top-full z-20 shadow-xl',
  },
  light: {
    input:
      'border-amber-900/20 bg-white text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:ring-amber-600/30',
    clear: 'text-stone-400 hover:bg-stone-100 hover:text-stone-800',
    list: 'relative shadow-sm',
  },
};

export function PersonSearch({
  entries,
  onSelect,
  onClear,
  tone = 'page',
  label = 'Tìm người trong gia phả',
  autoFocus = false,
}: {
  entries: PersonSearchEntry[];
  onSelect: (personId: string) => void;
  onClear: () => void;
  tone?: keyof typeof TONES;
  label?: string;
  autoFocus?: boolean;
}) {
  const styles = TONES[tone];
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useMemo(() => searchPeople(entries, query, MAX_RESULTS), [entries, query]);
  const showList = open && query.trim().length > 0;

  function choose(result: PersonSearchResult) {
    setQuery(displayPersonName(result.person.name));
    setOpen(false);
    onSelect(result.person.id);
  }

  function clear() {
    setQuery('');
    setOpen(false);
    onClear();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      if (showList) setOpen(false);
      else clear();
      return;
    }
    if (results.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (index + step + results.length) % results.length);
    } else if (event.key === 'Enter' && showList) {
      event.preventDefault();
      const result = results[activeIndex];
      if (result) choose(result);
    }
  }

  return (
    <div className="relative w-full max-w-md">
      <Search
        className="pointer-events-none absolute left-3 top-3 size-4 text-stone-400"
        aria-hidden="true"
      />
      <input
        type="search"
        role="combobox"
        aria-label={label}
        autoFocus={autoFocus}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && results[activeIndex] ? `${listId}-${activeIndex}` : undefined
        }
        placeholder="Tìm kiếm"
        autoComplete="off"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        className={cn(
          'h-10 w-full rounded-xl border pl-9 pr-9 text-base focus:outline-none sm:text-sm focus:ring-2 [&::-webkit-search-cancel-button]:hidden',
          styles.input,
        )}
      />
      {query ? (
        <button
          type="button"
          onClick={clear}
          aria-label="Xoá tìm kiếm"
          className={cn(
            'absolute right-2 top-1.5 grid size-7 place-items-center rounded-lg',
            styles.clear,
          )}
        >
          <X className="size-4" />
        </button>
      ) : null}

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Kết quả tìm kiếm"
          className={cn(
            'mt-1 max-h-80 overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 text-sm',
            styles.list,
          )}
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-stone-500">Không tìm thấy người nào</li>
          ) : (
            results.map((result, index) => (
              <li
                key={result.person.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(result)}
                className={cn(
                  'cursor-pointer px-3 py-2',
                  index === activeIndex ? 'bg-amber-50' : undefined,
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-semibold text-stone-900">
                    {displayPersonName(result.person.name)}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-brand-700">
                    Đời {result.generation}
                  </span>
                </div>
                <p className="truncate text-xs text-stone-500">
                  {[
                    result.matchedAlias ? `“${result.matchedAlias}”` : null,
                    result.lifespan,
                    result.fatherName ? `Con của ${displayPersonName(result.fatherName)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
