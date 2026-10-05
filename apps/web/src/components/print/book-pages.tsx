import type { CSSProperties, ReactNode } from 'react';

import {
  LIST_HEADING,
  NOTE_HEIGHT,
  PAGE_FRAME,
  PRINT_CARD,
  type BookPage,
  type PageGeometry,
  type PrintCard,
  type TreePage,
} from '@/lib/print-book';
import { BookCoverArt, type CoverTemplate } from '@/components/print/book-cover';
import { PosterOverview } from '@/components/print/poster-overview';
import type { FamilyPoster } from '@/lib/poster-decorations';
import { cn } from '@/lib/utils';
import type { FamilyTreeResponse } from '@/types/family-tree';

/** What the cover and the introduction say about the family. */
export type BookCover = {
  familyName: string;
  /** The clan's surname, read from its members' names; null when it cannot be told. */
  surname: string | null;
  template: CoverTemplate;
  description: string | null;
  ancestryOrigin: string | null;
  address: string | null;
  deathAnniversary: string | null;
  peopleCount: number;
  generationCount: number;
  printedOn: string;
  printedYear: number;
};

const INK = '#7a1616';
const LINE_COLOR = '#8b1a1a';

/** Long names step down so they still fit two lines of the card. */
function nameSize(name: string): number {
  if (name.length <= 16) return 13.5;
  if (name.length <= 24) return 12;
  return 11;
}

function Sheet({
  geometry,
  number,
  header,
  children,
}: {
  geometry: PageGeometry;
  number: number | null;
  header?: ReactNode;
  children: ReactNode;
}) {
  const { margin, header: headerHeight, footer } = PAGE_FRAME;
  return (
    <section
      className="book-sheet relative overflow-hidden bg-white text-stone-900 [print-color-adjust:exact]"
      style={{ width: `${geometry.widthMm}mm`, height: `${geometry.heightMm}mm` }}
    >
      {header ? (
        <header
          className="absolute flex items-start justify-between gap-6 border-b border-[#8b1a1a]/30"
          style={{ left: margin, right: margin, top: margin, height: headerHeight - 8 }}
        >
          {header}
        </header>
      ) : null}
      {children}
      {number !== null ? (
        <footer
          className="absolute inset-x-0 text-center text-[10px] tracking-widest text-stone-500"
          style={{ bottom: margin, height: footer - 6 }}
        >
          — {number} —
        </footer>
      ) : null}
    </section>
  );
}

function RunningHeader({ familyName, title, subtitle }: { familyName: string; title: string; subtitle?: string | null }) {
  return (
    <>
      <span className="shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b1a1a]/80">
        {familyName.trim().toLocaleLowerCase('vi').startsWith('gia phả') ? familyName : `Gia phả ${familyName}`}
      </span>
      <span className="min-w-0 text-right leading-tight">
        <span className="block truncate text-[13px] font-bold" style={{ color: INK }}>
          {title}
        </span>
        {subtitle ? <span className="block truncate text-[9.5px] text-stone-600">{subtitle}</span> : null}
      </span>
    </>
  );
}

function Card({ card }: { card: PrintCard }) {
  return (
    <div
      className="absolute flex flex-col items-center justify-center overflow-hidden rounded-md border-[1.5px] border-[#8b1a1a] bg-[#fffaf0] px-1.5 py-1 text-center"
      style={{ left: card.x, top: card.y, width: PRINT_CARD.width, height: PRINT_CARD.height }}
    >
      {card.caption ? (
        <p className="max-w-full truncate text-[8.5px] font-semibold uppercase leading-[11px] tracking-wide text-[#8b1a1a]/75">
          {card.caption}
        </p>
      ) : null}
      <p
        className="line-clamp-2 max-w-full font-bold leading-[1.15] text-balance"
        style={{ fontSize: nameSize(card.name), color: INK }}
      >
        {card.name}
      </p>
      {card.life ? (
        <p className="mt-0.5 max-w-full truncate text-[9.5px] leading-[12px] text-stone-700">{card.life}</p>
      ) : null}
    </div>
  );
}

function TreeSheet({
  page,
  geometry,
  familyName,
}: {
  page: TreePage;
  geometry: PageGeometry;
  familyName: string;
}) {
  const { tree } = geometry;
  const horizontal = page.direction === 'horizontal';
  // A top-down tree hangs from the top, centred across; a left-to-right one grows from the
  // middle of the left edge.
  const left = horizontal ? tree.left : tree.left + (tree.width - page.width * page.scale) / 2;
  const top = horizontal ? tree.top + (tree.height - page.height * page.scale) / 2 : tree.top;
  const content: CSSProperties = {
    left,
    top,
    width: page.width,
    height: page.height,
    transform: `scale(${page.scale})`,
    transformOrigin: '0 0',
  };
  return (
    <Sheet
      geometry={geometry}
      number={page.number}
      header={<RunningHeader familyName={familyName} title={page.title} subtitle={page.subtitle} />}
    >
      {page.rowLabels.map((label, index) => (
        <span
          key={index}
          className={cn(
            'absolute whitespace-nowrap rounded-sm bg-[#8b1a1a] px-1.5 py-0.5 text-[9px] font-semibold text-white',
            horizontal ? '-translate-x-1/2' : '-translate-y-1/2',
          )}
          style={
            horizontal
              ? { left: left + label.at * page.scale, top: tree.top - PAGE_FRAME.labelStrip + 4 }
              : geometry.rotated
                ? { right: PAGE_FRAME.margin, top: top + label.at * page.scale }
                : { left: PAGE_FRAME.margin, top: top + label.at * page.scale }
          }
        >
          Đời {label.generation}
        </span>
      ))}
      <div className="absolute" style={content}>
        <svg
          className="absolute inset-0 overflow-visible"
          width={page.width}
          height={page.height}
          aria-hidden="true"
        >
          {page.paths.map((path, index) => (
            <path key={index} d={path} fill="none" stroke={LINE_COLOR} strokeWidth={1.25} />
          ))}
        </svg>
        {page.cards.map((card) => (
          <Card key={card.id} card={card} />
        ))}
        {page.notes.map((note, index) => (
          <span
            key={index}
            className={cn(
              'absolute whitespace-nowrap rounded-full border border-[#8b1a1a]/50 bg-white px-2 text-[8.5px] font-semibold italic',
              note.anchor === 'below' && '-translate-x-1/2',
              note.anchor === 'after' && '-translate-y-1/2',
              note.anchor === 'before' && '-translate-x-full -translate-y-1/2',
            )}
            style={{ left: note.x, top: note.y, height: NOTE_HEIGHT - 6, lineHeight: `${NOTE_HEIGHT - 8}px`, color: INK }}
          >
            {note.anchor === 'before' ? '◂' : '▸'} {note.text}
          </span>
        ))}
      </div>
    </Sheet>
  );
}

function CoverSheet({ geometry, cover }: { geometry: PageGeometry; cover: BookCover }) {
  return (
    <Sheet geometry={geometry} number={null}>
      <BookCoverArt
        template={cover.template}
        text={{
          familyName: cover.familyName,
          surname: cover.surname,
          place: cover.ancestryOrigin ?? cover.address,
          printedYear: cover.printedYear,
        }}
        width={geometry.width}
        height={geometry.height}
      />
    </Sheet>
  );
}

const SAMPLE_CARD: PrintCard = {
  id: 'sample',
  x: 0,
  y: 0,
  name: 'Nguyễn Văn An',
  caption: 'Con vợ 2',
  life: '1890–1955 · Giỗ 12/3 ÂL',
};

const LEGEND: { term: string; meaning: string }[] = [
  { term: 'Đời n', meaning: 'Thế hệ thứ n, tính từ thuỷ tổ là đời 1.' },
  { term: '1890–1955', meaning: 'Năm sinh và năm mất. “s. 1960” là sinh năm 1960, còn sống.' },
  { term: 'Giỗ 12/3 ÂL', meaning: 'Ngày giỗ: ngày 12 tháng 3 âm lịch.' },
  { term: 'Vợ 1, Vợ 2 · Chồng', meaning: 'Thẻ của vợ hoặc chồng, đứng cạnh người trong họ, nối bằng đường hôn nhân.' },
  { term: 'Con vợ 2', meaning: 'Người cha có nhiều vợ: người này là con của người vợ thứ hai.' },
  { term: '▸ Xem trang 12', meaning: 'Con cháu của người này được vẽ tiếp ở trang 12.' },
  { term: '▸ Tiếp từ trang 4', meaning: 'Người này đã có trên trang 4; trang này vẽ tiếp con cháu.' },
  { term: '(phần 1/2)', meaning: 'Gia đình đông con được chia sang nhiều trang liền nhau.' },
];

function IntroSheet({ geometry, cover, number }: { geometry: PageGeometry; cover: BookCover; number: number }) {
  const { text } = geometry;
  const details = [
    { label: 'Nguyên quán', value: cover.ancestryOrigin },
    { label: 'Nhà thờ họ', value: cover.address },
    { label: 'Giỗ tổ', value: cover.deathAnniversary },
    { label: 'Số thành viên', value: `${cover.peopleCount} người, ${cover.generationCount} đời` },
    { label: 'Ngày in', value: cover.printedOn },
  ].filter((detail) => detail.value);
  return (
    <Sheet
      geometry={geometry}
      number={number}
      header={<RunningHeader familyName={cover.familyName} title="Giới thiệu" />}
    >
      <div
        className="absolute flex flex-col gap-6 overflow-hidden"
        style={{ left: text.left, top: text.top, width: text.width, height: text.height }}
      >
        <section>
          <h2 className="text-[22px] font-bold" style={{ color: INK, lineHeight: `${LIST_HEADING}px` }}>
            Giới thiệu dòng họ
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[12px]">
            {details.map((detail) => (
              <div key={detail.label} className="contents">
                <dt className="font-semibold text-stone-600">{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
          {cover.description ? (
            <p className="mt-4 whitespace-pre-line text-justify text-[12px] leading-relaxed text-stone-800">
              {cover.description}
            </p>
          ) : null}
        </section>

        <section className="mt-auto border-t border-[#8b1a1a]/30 pt-4">
          <h2 className="text-[18px] font-bold" style={{ color: INK }}>
            Chú thích
          </h2>
          <p className="mt-1 text-[11px] text-stone-600">
            Trang tổng quát vẽ toàn bộ cây trên một trang. Các trang sau vẽ từng chi theo cùng
            cách: mỗi thẻ là một người, con nối từ giữa đường hôn nhân của cha mẹ.
          </p>
          <div className="mt-3 flex gap-6">
            <div className="relative shrink-0" style={{ width: PRINT_CARD.width, height: PRINT_CARD.height }}>
              <Card card={SAMPLE_CARD} />
            </div>
            <dl className="grid flex-1 grid-cols-[auto_1fr] content-start gap-x-3 gap-y-1 text-[10.5px] leading-snug">
              {LEGEND.map((item) => (
                <div key={item.term} className="contents">
                  <dt className="whitespace-nowrap font-semibold" style={{ color: INK }}>
                    {item.term}
                  </dt>
                  <dd className="text-stone-700">{item.meaning}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>
    </Sheet>
  );
}

/** The data the overview poster is drawn from. */
export type BookOverview = {
  tree: FamilyTreeResponse;
  family: { name: string; poster: FamilyPoster };
  familySlug: string;
};

function OverviewSheet({
  geometry,
  cover,
  overview,
  number,
}: {
  geometry: PageGeometry;
  cover: BookCover;
  overview: BookOverview;
  number: number;
}) {
  const { text } = geometry;
  return (
    <Sheet
      geometry={geometry}
      number={number}
      header={
        <RunningHeader
          familyName={cover.familyName}
          title="Phả đồ tổng quát"
          subtitle="Chi tiết từng chi ở các trang sau"
        />
      }
    >
      <div className="absolute" style={{ left: text.left, top: text.top, width: text.width, height: text.height }}>
        <PosterOverview {...overview} width={text.width} height={text.height} />
      </div>
    </Sheet>
  );
}

function ListSheet({
  geometry,
  familyName,
  number,
  heading,
  columns,
  children,
}: {
  geometry: PageGeometry;
  familyName: string;
  number: number;
  heading: string | null;
  columns: number;
  children: ReactNode;
}) {
  const { text } = geometry;
  return (
    <Sheet
      geometry={geometry}
      number={number}
      header={<RunningHeader familyName={familyName} title={heading ?? 'tiếp theo'} />}
    >
      <div className="absolute" style={{ left: text.left, top: text.top, width: text.width, height: text.height }}>
        {heading ? (
          <h2 className="text-[22px] font-bold" style={{ color: INK, lineHeight: `${LIST_HEADING}px` }}>
            {heading}
          </h2>
        ) : null}
        <ol className="gap-8 [column-fill:auto]" style={{ columnCount: columns, height: `calc(100% - ${LIST_HEADING}px)` }}>
          {children}
        </ol>
      </div>
    </Sheet>
  );
}

export function BookSheet({
  page,
  geometry,
  cover,
  overview,
}: {
  page: BookPage;
  geometry: PageGeometry;
  cover: BookCover;
  overview: BookOverview;
}) {
  switch (page.kind) {
    case 'cover':
      return <CoverSheet geometry={geometry} cover={cover} />;
    case 'intro':
      return <IntroSheet geometry={geometry} cover={cover} number={page.number} />;
    case 'poster':
      return <OverviewSheet geometry={geometry} cover={cover} overview={overview} number={page.number} />;
    case 'tree':
      return <TreeSheet page={page} geometry={geometry} familyName={cover.familyName} />;
    case 'contents':
      return (
        <ListSheet
          geometry={geometry}
          familyName={cover.familyName}
          number={page.number}
          heading={page.first ? 'Mục lục' : null}
          columns={page.columns}
        >
          {page.entries.map((entry, index) => (
            <li
              key={index}
              className="flex h-[22px] break-inside-avoid items-baseline gap-2 text-[11.5px]"
              style={{ paddingLeft: Math.min(entry.depth, 6) * 14 }}
            >
              <span className={cn('truncate', entry.depth === 0 && 'font-bold')}>{entry.title}</span>
              <span className="min-w-4 flex-1 border-b border-dotted border-stone-400" />
              <span className="tabular-nums">{entry.page}</span>
            </li>
          ))}
        </ListSheet>
      );
    case 'index':
      return (
        <ListSheet
          geometry={geometry}
          familyName={cover.familyName}
          number={page.number}
          heading={page.first ? 'Tra cứu theo tên' : null}
          columns={page.columns}
        >
          {page.entries.map((entry, index) => (
            <li key={index} className="flex h-[17px] break-inside-avoid items-baseline gap-1.5 text-[10.5px]">
              <span className="truncate font-medium">{entry.name}</span>
              <span className="shrink-0 text-[9px] text-stone-500">đời {entry.generation}</span>
              <span className="min-w-3 flex-1 border-b border-dotted border-stone-300" />
              <span className="shrink-0 tabular-nums">{entry.pages}</span>
            </li>
          ))}
        </ListSheet>
      );
  }
}
