'use client';

import { Printer } from 'lucide-react';
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';

import { BookCoverArt, COVER_TEMPLATES, type CoverTemplate } from '@/components/print/book-cover';
import { BookSheet, type BookCover, type BookOverview } from '@/components/print/book-pages';
import { PrintEndCard } from '@/components/print/print-end-card';
import { Button } from '@/components/ui/button';
import {
  buildPrintBook,
  PAPER_SIZES,
  paperOf,
  sheetOf,
  type PageGeometry,
  type SheetKind,
  type Orientation,
  type PaperSize,
} from '@/lib/print-book';
import { clanSurname } from '@/lib/han-viet';
import { cn } from '@/lib/utils';
import { formatDay, todayInVietnam } from '@/lib/vietnam-date';
import type { FamilyDetails, FamilyTreeResponse } from '@/types/family-tree';

export const PAPER_CHOICES: { size: PaperSize; hint: string }[] = [
  { size: 'A4', hint: 'Máy in văn phòng' },
  { size: 'A3', hint: 'Máy in khổ lớn' },
  { size: 'A2', hint: 'Tiệm in' },
  { size: 'A1', hint: 'Tiệm in, treo tường' },
  { size: 'A0', hint: 'Tiệm in, treo tường' },
];

const ORIENTATIONS: { value: Orientation; label: string }[] = [
  { value: 'topDown', label: 'Cây dọc - Từ trên xuống dưới' },
  { value: 'leftToRight', label: 'Cây Ngang - Chữ Ngang' },
  { value: 'rotated', label: 'Cây Ngang - Chữ Dọc' },
];

const subscribeNever = (): (() => void) => () => {};

export function usePreviewZoom(pageWidthPx: number): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width ? Math.min(1, width / pageWidthPx) : 0.5];
}

function pageRules(sheets: Record<SheetKind, PageGeometry>): string {
  return Object.entries(sheets)
    .map(([kind, sheet]) => {
      const paper = paperOf(sheet);
      return `@page sheet-${kind} { size: ${paper.widthMm}mm ${paper.heightMm}mm; margin: 0; }`;
    })
    .join('\n');
}

function Paper({ geometry, children }: { geometry: PageGeometry; children: ReactNode }) {
  if (!geometry.rotated) return children;
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: `${geometry.heightMm}mm`, height: `${geometry.widthMm}mm` }}
    >
      <div
        className="absolute left-0"
        style={{
          top: `${geometry.widthMm}mm`,
          transform: 'rotate(-90deg)',
          transformOrigin: '0 0',
        }}
      >
        {children}
      </div>
    </div>
  );
}

const THUMBNAIL_WIDTH = 92;

type PrintBookViewProps = {
  tree: FamilyTreeResponse;
  family: FamilyDetails;
  familySlug: string;
  header: ReactNode;
};

export function PrintBookView({ tree, family, familySlug, header }: PrintBookViewProps) {
  const [size, setSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('topDown');
  const [template, setTemplate] = useState<CoverTemplate>('do-son');
  const laidOutSize = useDeferredValue(size);
  const isBrowser = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const books = useMemo(
    () =>
      isBrowser
        ? {
            leftToRight: buildPrintBook(tree, { size: laidOutSize, orientation: 'leftToRight' }),
            topDown: buildPrintBook(tree, { size: laidOutSize, orientation: 'topDown' }),
            rotated: buildPrintBook(tree, { size: laidOutSize, orientation: 'rotated' }),
          }
        : null,
    [isBrowser, laidOutSize, tree],
  );
  const book = books?.[orientation] ?? null;
  const [previewRef, zoom] = usePreviewZoom(
    book
      ? (Math.max(paperOf(book.sheets.tree).widthMm, paperOf(book.sheets.text).widthMm) * 96) / 25.4
      : 1123,
  );

  const cover = useMemo<BookCover>(
    () => ({
      familyName: family.name,
      surname: clanSurname(
        family.name,
        tree.people.filter((person) => person.gender === 'MALE').map((person) => person.name),
      ),
      template,
      description: family.description,
      ancestryOrigin: family.ancestryOrigin,
      address: family.address,
      deathAnniversary:
        family.deathAnniversaryDay && family.deathAnniversaryMonth
          ? `ngày ${family.deathAnniversaryDay} tháng ${family.deathAnniversaryMonth} (âm lịch)`
          : null,
      peopleCount: tree.people.length,
      generationCount: book?.generationCount ?? 0,
      printedOn: formatDay(todayInVietnam()),
      printedYear: Number(todayInVietnam().slice(0, 4)),
    }),
    [book?.generationCount, family, template, tree],
  );

  const overview = useMemo<BookOverview>(
    () => ({ tree, family: { name: family.name, poster: family.poster }, familySlug }),
    [family.name, family.poster, familySlug, tree],
  );

  const stale = laidOutSize !== size;
  const summary = book ? (
    <>
      <strong className="text-stone-900">{book.pages.length} trang</strong> khổ {laidOutSize} ·{' '}
      {book.treePageCount} trang phả đồ · mỗi trang tối đa {book.sheets.tree.rows} đời,{' '}
      {book.sheets.tree.columns} thẻ mỗi đời
    </>
  ) : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-stone-200/70 print:min-h-0 print:bg-white">
      {book ? (
        <style>
          {pageRules(book.sheets) +
            `
@media print { html, body { background: #fff !important; } .book-page { break-after: page; } .book-page:last-child { break-after: auto; } }`}
        </style>
      ) : null}

      <div className="border-b border-stone-300 bg-[#fffdf8] print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1 space-y-3">
            {header}

            <fieldset>
              <legend className="mb-1.5 text-xs font-medium uppercase tracking-wide text-stone-500">
                Khổ giấy
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

            <fieldset>
              <legend className="mb-1.5 text-xs font-medium uppercase tracking-wide text-stone-500">
                Mẫu bìa
              </legend>
              <div className="flex flex-wrap gap-3">
                {COVER_TEMPLATES.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    aria-pressed={template === choice.id}
                    onClick={() => setTemplate(choice.id)}
                    className={cn(
                      'rounded-xl border-2 p-1.5 text-left transition',
                      template === choice.id
                        ? 'border-brand-800 bg-brand-50'
                        : 'border-transparent hover:border-brand-700/50',
                    )}
                  >
                    <span
                      className="block overflow-hidden rounded-sm shadow ring-1 ring-stone-300"
                      style={{ width: THUMBNAIL_WIDTH, height: (THUMBNAIL_WIDTH * 297) / 210 }}
                    >
                      <BookCoverArt
                        template={choice.id}
                        text={{
                          familyName: cover.familyName,
                          surname: cover.surname,
                          place: cover.ancestryOrigin ?? cover.address,
                          printedYear: cover.printedYear,
                        }}
                        width={THUMBNAIL_WIDTH}
                        height={(THUMBNAIL_WIDTH * 297) / 210}
                      />
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-stone-800">
                      {choice.name}
                    </span>
                    <span className="block text-[11px] text-stone-500">{choice.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1.5 text-xs font-medium uppercase tracking-wide text-stone-500">
                Hướng phần cây
              </legend>
              <div className="grid max-w-xl gap-2">
                {ORIENTATIONS.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    aria-pressed={orientation === choice.value}
                    onClick={() => setOrientation(choice.value)}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition',
                      orientation === choice.value
                        ? 'border-brand-800 bg-brand-50 font-semibold text-brand-950'
                        : 'border-stone-300 bg-white text-stone-700 hover:border-brand-700',
                    )}
                  >
                    <span>{choice.label}</span>
                    {books && !stale ? (
                      <span className="shrink-0 font-normal text-stone-500">
                        {books[choice.value].pages.length} trang
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
              {book ? (
                <p className={cn('mt-2 text-sm text-stone-600', stale && 'opacity-50')}>
                  {summary}
                </p>
              ) : null}
            </fieldset>
          </div>

          <div className="space-y-1.5 lg:w-72">
            <Button
              type="button"
              className="w-full"
              disabled={!book || stale}
              onClick={() => window.print()}
            >
              <Printer className="size-4" aria-hidden="true" />
              Xuất PDF / In
            </Button>
            <p className="text-[11px] leading-snug text-stone-500">
              Mọi trang đều in giấy dọc; lựa chọn trên chỉ đổi hướng cây ở trang tổng quát và các
              trang chi. Trong hộp thoại in: chọn <b>Lưu dưới dạng PDF</b>, lề <b>Không có</b> và
              bật <b>Đồ hoạ nền</b>.
            </p>
          </div>
        </div>
      </div>

      <div
        ref={previewRef}
        className="mx-auto max-w-6xl px-4 py-6 sm:px-6 print:max-w-none print:p-0"
        aria-busy={!book || stale}
      >
        {book ? (
          <div
            className={cn(
              'flex flex-col items-center gap-6 [zoom:var(--preview-zoom)] print:block print:[zoom:1]',
              stale && 'opacity-60',
            )}
            style={{ '--preview-zoom': zoom } as CSSProperties}
          >
            {book.pages.map((page) => (
              <div
                key={page.number}
                className="book-page shadow-lg ring-1 ring-stone-300 print:shadow-none print:ring-0"
                style={{ page: `sheet-${sheetOf(page)}` }}
              >
                <Paper geometry={book.sheets[sheetOf(page)]}>
                  <BookSheet
                    page={page}
                    geometry={book.sheets[sheetOf(page)]}
                    cover={cover}
                    overview={overview}
                  />
                </Paper>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-20 text-center text-sm text-stone-500">Đang dàn trang…</p>
        )}
        {book ? <PrintEndCard summary={summary} disabled={stale} /> : null}
      </div>
    </div>
  );
}
