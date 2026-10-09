'use client';

import { ArrowLeft, BookOpen, Network } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { PrintBookView } from '@/components/print/print-book-view';
import { PrintTreeView } from '@/components/print/print-tree-view';
import { cn } from '@/lib/utils';
import type { FamilyDetails, FamilyTreeResponse } from '@/types/family-tree';

type PrintMode = 'book' | 'tree';

const MODES: { value: PrintMode; label: string; icon: typeof BookOpen }[] = [
  { value: 'book', label: 'In thành quyển', icon: BookOpen },
  { value: 'tree', label: 'In cây gia phả', icon: Network },
];

type PrintStudioProps = {
  tree: FamilyTreeResponse;
  family: FamilyDetails;
  familySlug: string;
};

/** The print page: a bound book of the whole gia phả, or the phả đồ alone on one sheet. */
export function PrintStudio({ tree, family, familySlug }: PrintStudioProps) {
  const [mode, setMode] = useState<PrintMode>('book');

  const header = (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href={`/${encodeURIComponent(familySlug)}/gia-pha`}
        className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-brand-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Phả đồ
      </Link>
      <h1 className="sr-only">In gia phả</h1>
      <div
        role="radiogroup"
        aria-label="Kiểu in"
        className="inline-flex rounded-xl border border-stone-300 bg-white p-1"
      >
        {MODES.map((choice) => (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={mode === choice.value}
            onClick={() => setMode(choice.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition',
              mode === choice.value
                ? 'bg-brand-900 text-white shadow-sm'
                : 'text-stone-700 hover:bg-stone-100',
            )}
          >
            <choice.icon className="size-4" aria-hidden="true" />
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );

  return mode === 'book' ? (
    <PrintBookView tree={tree} family={family} familySlug={familySlug} header={header} />
  ) : (
    <PrintTreeView tree={tree} family={family} familySlug={familySlug} header={header} />
  );
}
