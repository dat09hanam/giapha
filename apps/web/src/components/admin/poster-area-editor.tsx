'use client';

import { Eraser } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

import {
  PosterBackgroundSwatch,
  PosterFamilyName,
  PosterSafeAreaOutline,
} from '@/components/tree/poster-art';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_NAME_COLOR,
  MAX_OPPOSITE_INSETS_PERCENT,
  MIN_NAME_AREA_PERCENT,
  type PosterDecoration,
  type PosterInsets,
  type PosterNameArea,
} from '@/lib/poster-decorations';

/** Size of the grab zone around an edge or corner, in screen pixels. */
const GRAB = 14;
/** Shown in the name area while the ADMIN edits; families see their own name. */
const SAMPLE_NAME = 'Dòng họ Nguyễn';

export const NO_TREE_AREA: PosterInsets = { top: 0, right: 0, bottom: 0, left: 0 };

export function hasTreeArea(insets: PosterInsets): boolean {
  return insets.top + insets.right + insets.bottom + insets.left > 0;
}

type AreaKey = 'tree' | 'name';

/** The smallest width and height each area may have, in percent of the sheet (the API's limits). */
const MIN_SIZE: Record<AreaKey, number> = {
  tree: 100 - MAX_OPPOSITE_INSETS_PERCENT,
  name: MIN_NAME_AREA_PERCENT,
};

const AREA_STYLE: Record<AreaKey, { label: string; outline: string; handle: string }> = {
  tree: {
    label: 'Cây gia phả',
    outline: 'border-emerald-700 bg-emerald-600/10 text-emerald-900',
    handle: 'border-emerald-700 group-hover:bg-emerald-100',
  },
  name: {
    label: '',
    outline: 'border-sky-700 bg-sky-500/10',
    handle: 'border-sky-700 group-hover:bg-sky-100',
  },
};

type Point = { x: number; y: number };
type Edge = keyof PosterInsets;

/** What a drag does: draw a new area, move the whole area, or pull some of its edges. */
type DragMode = { kind: 'draw' } | { kind: 'move' } | { kind: 'resize'; edges: readonly Edge[] };

type Drag = { mode: DragMode; start: Point; before: PosterInsets | null };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function insetsOf(area: PosterInsets): PosterInsets {
  return { top: area.top, right: area.right, bottom: area.bottom, left: area.left };
}

function insetsBetween(start: Point, end: Point): PosterInsets {
  return {
    top: Math.round(Math.min(start.y, end.y)),
    right: Math.round(100 - Math.max(start.x, end.x)),
    bottom: Math.round(100 - Math.max(start.y, end.y)),
    left: Math.round(Math.min(start.x, end.x)),
  };
}

/** Pulls the chosen edges to the pointer, keeping the area at least `minSize`. */
function resized(
  before: PosterInsets,
  edges: readonly Edge[],
  point: Point,
  minSize: number,
): PosterInsets {
  const next = { ...before };
  const room = (opposite: number): number => 100 - opposite - minSize;
  if (edges.includes('top')) next.top = clamp(Math.round(point.y), 0, room(before.bottom));
  if (edges.includes('bottom')) next.bottom = clamp(Math.round(100 - point.y), 0, room(before.top));
  if (edges.includes('left')) next.left = clamp(Math.round(point.x), 0, room(before.right));
  if (edges.includes('right')) next.right = clamp(Math.round(100 - point.x), 0, room(before.left));
  return next;
}

/** Shifts the whole area by the pointer's travel, keeping it on the sheet. */
function moved(before: PosterInsets, start: Point, point: Point): PosterInsets {
  const spareX = before.left + before.right;
  const spareY = before.top + before.bottom;
  const left = clamp(Math.round(before.left + point.x - start.x), 0, spareX);
  const top = clamp(Math.round(before.top + point.y - start.y), 0, spareY);
  return { top, right: spareX - left, bottom: spareY - top, left };
}

function tooSmall(insets: PosterInsets, minSize: number): boolean {
  return 100 - insets.left - insets.right < minSize || 100 - insets.top - insets.bottom < minSize;
}

const HANDLES: { edges: readonly Edge[]; cursor: string; label: string }[] = [
  { edges: ['top'], cursor: 'ns-resize', label: 'Kéo cạnh trên' },
  { edges: ['bottom'], cursor: 'ns-resize', label: 'Kéo cạnh dưới' },
  { edges: ['left'], cursor: 'ew-resize', label: 'Kéo cạnh trái' },
  { edges: ['right'], cursor: 'ew-resize', label: 'Kéo cạnh phải' },
  { edges: ['top', 'left'], cursor: 'nwse-resize', label: 'Kéo góc trên trái' },
  { edges: ['bottom', 'right'], cursor: 'nwse-resize', label: 'Kéo góc dưới phải' },
  { edges: ['top', 'right'], cursor: 'nesw-resize', label: 'Kéo góc trên phải' },
  { edges: ['bottom', 'left'], cursor: 'nesw-resize', label: 'Kéo góc dưới trái' },
];

/** Where an edge or corner grab zone sits over an area; no edges gives its inner body. */
function handleStyle(insets: PosterInsets, edges: readonly Edge[]): CSSProperties {
  const half = GRAB / 2;
  const style: CSSProperties = {};
  const vertical = edges.find((edge) => edge === 'top' || edge === 'bottom');
  const horizontal = edges.find((edge) => edge === 'left' || edge === 'right');

  if (vertical) {
    style[vertical] = `calc(${insets[vertical]}% - ${half}px)`;
    style.height = GRAB;
  } else {
    style.top = `calc(${insets.top}% + ${half}px)`;
    style.bottom = `calc(${insets.bottom}% + ${half}px)`;
  }
  if (horizontal) {
    style[horizontal] = `calc(${insets[horizontal]}% - ${half}px)`;
    style.width = GRAB;
  } else {
    style.left = `calc(${insets.left}% + ${half}px)`;
    style.right = `calc(${insets.right}% + ${half}px)`;
  }
  return style;
}

/**
 * The background drawn at the sheet's 16:9, where the ADMIN marks the area
 * the tree is placed in and the area the family name is written in: drag on
 * the art to draw the chosen area, drag its edges or corners to resize it,
 * and drag inside it to move it. The sheet is stretched to any tree's size,
 * so areas are kept in percent and line up with the art at every size.
 */
export function PosterAreaEditor({
  background,
  treeArea,
  nameArea,
  onTreeAreaChange,
  onNameAreaChange,
}: {
  background: PosterDecoration;
  treeArea: PosterInsets;
  nameArea: PosterNameArea | null;
  onTreeAreaChange: (insets: PosterInsets) => void;
  onNameAreaChange: (area: PosterNameArea | null) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<AreaKey>('tree');
  const [drag, setDrag] = useState<(Drag & { area: AreaKey }) | null>(null);

  const areas: Record<AreaKey, PosterInsets | null> = {
    tree: hasTreeArea(treeArea) ? treeArea : null,
    name: nameArea ? insetsOf(nameArea) : null,
  };

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  function setArea(key: AreaKey, insets: PosterInsets | null): void {
    if (key === 'tree') {
      onTreeAreaChange(insets ?? NO_TREE_AREA);
    } else {
      onNameAreaChange(
        insets
          ? {
              ...insets,
              curve: nameArea?.curve ?? 0,
              color: nameArea?.color ?? DEFAULT_NAME_COLOR,
            }
          : null,
      );
    }
  }

  function pointAt(event: PointerEvent<HTMLElement>): Point {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  }

  function startDrag(event: PointerEvent<HTMLElement>, area: AreaKey, mode: DragMode): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    // The sheet keeps receiving the pointer even when it leaves a small handle.
    boxRef.current?.setPointerCapture(event.pointerId);
    setActive(area);
    setDrag({ area, mode, start: pointAt(event), before: areas[area] });
  }

  function dragTo(current: Drag & { area: AreaKey }, point: Point): PosterInsets {
    const { mode, before, start, area } = current;
    if (mode.kind === 'draw' || !before) return insetsBetween(start, point);
    if (mode.kind === 'move') return moved(before, start, point);
    return resized(before, mode.edges, point, MIN_SIZE[area]);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (drag) setArea(drag.area, dragTo(drag, pointAt(event)));
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>): void {
    if (!drag) return;
    const next = dragTo(drag, pointAt(event));
    // A click or a sliver drawn by mistake keeps the previous area.
    const keep = drag.mode.kind === 'draw' && tooSmall(next, MIN_SIZE[drag.area]);
    setArea(drag.area, keep ? drag.before : next);
    setDrag(null);
  }

  const height = (width * 9) / 16;
  const activeArea = areas[active];
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Vùng đang chỉnh">
          {(
            [
              ['tree', 'Vùng đặt cây'],
              ['name', 'Vùng tên dòng họ'],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              role="radio"
              aria-checked={active === key}
              variant={active === key ? 'default' : 'outline'}
              onClick={() => setActive(key)}
            >
              <span
                className={
                  'size-2.5 rounded-full ' + (key === 'tree' ? 'bg-emerald-500' : 'bg-sky-500')
                }
                aria-hidden="true"
              />
              {label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setArea(active, null)}
          disabled={!activeArea}
        >
          <Eraser className="size-3.5" aria-hidden="true" />
          Bỏ vùng này
        </Button>
      </div>

      <div
        ref={boxRef}
        className="relative aspect-video w-full cursor-crosshair touch-none select-none overflow-hidden rounded-xl border bg-[#fff6c9]"
        onPointerDown={(event) => startDrag(event, active, { kind: 'draw' })}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          if (drag) setArea(drag.area, drag.before);
          setDrag(null);
        }}
        role="img"
        aria-label="Kéo chuột trên ảnh để vẽ, kéo cạnh hoặc góc để chỉnh vùng đặt cây và vùng tên dòng họ"
      >
        {width > 0 ? (
          <PosterBackgroundSwatch decoration={background} width={width} height={height} />
        ) : null}
        {nameArea && width > 0 ? (
          <PosterFamilyName area={nameArea} name={SAMPLE_NAME} width={width} height={height} />
        ) : null}

        {(['tree', 'name'] as const).map((key) => {
          const insets = areas[key];
          if (!insets) return null;
          const isActive = key === active;
          return (
            <div key={key} className={isActive ? '' : 'opacity-60'}>
              <PosterSafeAreaOutline
                insets={insets}
                label={AREA_STYLE[key].label}
                className={AREA_STYLE[key].outline}
              />
              <div
                className="absolute cursor-move"
                style={handleStyle(insets, [])}
                onPointerDown={(event) => startDrag(event, key, { kind: 'move' })}
                title="Kéo để di chuyển vùng"
              />
              {isActive
                ? HANDLES.map(({ edges, cursor, label }) => (
                    <div
                      key={edges.join('-')}
                      className="group absolute grid place-items-center"
                      style={{ ...handleStyle(insets, edges), cursor }}
                      onPointerDown={(event) => startDrag(event, key, { kind: 'resize', edges })}
                      title={label}
                    >
                      <span
                        className={
                          'rounded-sm border-2 bg-white shadow-sm transition ' +
                          AREA_STYLE[key].handle +
                          ' ' +
                          (edges.length === 2
                            ? 'size-3'
                            : edges[0] === 'top' || edges[0] === 'bottom'
                              ? 'h-2 w-8'
                              : 'h-8 w-2')
                        }
                      />
                    </div>
                  ))
                : null}
            </div>
          );
        })}
      </div>

      {active === 'name' && nameArea ? (
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <label className="grid gap-1.5 text-sm text-emerald-950" htmlFor="name-area-curve">
            <span className="font-medium">Độ cong của chữ: {nameArea.curve}%</span>
            <input
              id="name-area-curve"
              type="range"
              min={-100}
              max={100}
              step={1}
              value={nameArea.curve}
              onChange={(event) =>
                onNameAreaChange({ ...nameArea, curve: Number(event.currentTarget.value) })
              }
              className="accent-sky-700"
            />
            <span className="text-xs text-stone-500">
              Kéo sang phải để chữ uốn vồng lên giữa như băng cuốn thư, sang trái để võng xuống, 0
              để chữ thẳng.
            </span>
          </label>
          <label className="flex items-center gap-2 self-start text-sm text-emerald-950">
            <input
              type="color"
              value={nameArea.color}
              onChange={(event) =>
                onNameAreaChange({ ...nameArea, color: event.currentTarget.value })
              }
              className="h-9 w-12 rounded border bg-white"
            />
            Màu chữ
          </label>
        </div>
      ) : null}

      <p className="text-xs text-stone-500">
        Chọn vùng cần chỉnh, rồi kéo chuột trên ảnh để vẽ khung. Kéo các cạnh hoặc góc để chỉnh kích
        thước, kéo phần giữa khung để di chuyển. <strong>Vùng đặt cây</strong> là nơi cây gia phả tự
        co giãn vào; <strong>vùng tên dòng họ</strong> là nơi viết tên dòng họ mà trưởng họ đã nhập
        ở trang quản lý. Trưởng họ chỉ cần chọn hình nền.
      </p>
    </div>
  );
}
