'use client';

import { Printer } from 'lucide-react';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';

import { PosterOverview } from '@/components/print/poster-overview';
import { PrintEndCard } from '@/components/print/print-end-card';
import { PAPER_CHOICES, usePreviewZoom } from '@/components/print/print-book-view';
import { Button } from '@/components/ui/button';
import { PAPER_SIZES, type PaperSize } from '@/lib/print-book';
import { cn } from '@/lib/utils';
import type { FamilyDetails, FamilyTreeResponse } from '@/types/family-tree';

const PX_PER_MM = 96 / 25.4;

type PrintTreeViewProps = {
  tree: FamilyTreeResponse;
  family: FamilyDetails;
  familySlug: string;
  header: ReactNode;
};

export function PrintTreeView({ tree, family, familySlug, header }: PrintTreeViewProps) {
  const [size, setSize] = useState<PaperSize>('A3');
  const paper = { widthMm: PAPER_SIZES[size].long, heightMm: PAPER_SIZES[size].short };
  const pagePx = { width: paper.widthMm * PX_PER_MM, height: paper.heightMm * PX_PER_MM };
  const [previewRef, zoom] = usePreviewZoom(pagePx.width);
  const summary = (
    <>
      <strong className="text-stone-900">1 trang</strong> khổ {size} · toàn bộ phả đồ{' '}
      {tree.people.length} người, như khi xem trên màn hình
    </>
  );
  const poster = useMemo(
    () => ({ name: family.name, poster: family.poster }),
    [family.name, family.poster],
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-stone-200/70 print:min-h-0 print:bg-white">
      <style>
        {`@page { size: ${paper.widthMm}mm ${paper.heightMm}mm; margin: 0; }
@media print { html, body { background: #fff !important; } }`}
      </style>

      <div className="border-b border-stone-300 bg-[#fffdf8] print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1 space-y-3">
            {header}

            <fieldset>
              <legend className="mb-1.5 text-xs font-medium uppercase tracking-wide text-stone-500">
                Khổ giấy (ngang)
              </legend>
              <div className="flex flex-wrap gap-2">
                {PAPER_CHOICES.map((choice) => (
                  <button
                    key={choice.size}
                    type="button"
                    aria-pressed={size === choice.size}
                    onClick={() => setSize(choice.size)}
                    className={cn(
                      'rounded-xl border px-3 py-1.5 text-left transition',
                      size === choice.size
                        ? 'border-brand-800 bg-brand-900 text-white'
                        : 'border-stone-300 bg-white text-stone-800 hover:border-brand-700',
                    )}
                  >
                    <span className="block text-sm font-semibold">
                      {choice.size}{' '}
                      <span className="font-normal opacity-70">
                        {PAPER_SIZES[choice.size].long}×{PAPER_SIZES[choice.size].short} mm
                      </span>
                    </span>
                    <span className="block text-[11px] opacity-75">{choice.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <p className="text-sm text-stone-600">{summary}</p>
          </div>

          <div className="space-y-1.5 lg:w-72">
            <Button type="button" className="w-full" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden="true" />
              Xuất PDF / In
            </Button>
            <p className="text-[11px] leading-snug text-stone-500">
              Trong hộp thoại in: chọn <b>Lưu dưới dạng PDF</b>, hướng <b>Ngang</b>, lề{' '}
              <b>Không có</b> và bật <b>Đồ hoạ nền</b>.
            </p>
          </div>
        </div>
      </div>

      <div
        ref={previewRef}
        className="mx-auto max-w-6xl px-4 py-6 sm:px-6 print:max-w-none print:p-0"
      >
        <div
          className="flex justify-center [zoom:var(--preview-zoom)] print:block print:[zoom:1]"
          style={{ '--preview-zoom': zoom } as CSSProperties}
        >
          <section
            className="relative overflow-hidden bg-white shadow-lg ring-1 ring-stone-300 [print-color-adjust:exact] print:shadow-none print:ring-0"
            style={{ width: `${paper.widthMm}mm`, height: `${paper.heightMm}mm` }}
            aria-label={`Phả đồ ${family.name}`}
          >
            <PosterOverview
              tree={tree}
              family={poster}
              familySlug={familySlug}
              width={pagePx.width}
              height={pagePx.height}
            />
          </section>
        </div>
        <PrintEndCard summary={summary} />
      </div>
    </div>
  );
}
