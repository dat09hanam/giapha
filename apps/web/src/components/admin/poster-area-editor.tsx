'use client';

import { Eraser } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import {
  PosterBackgroundSwatch,
  PosterFamilyName,
  PosterSafeAreaOutline,
  PosterVerticalText,
} from '@/components/tree/poster-art';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_NAME_COLOR,
  MAX_OPPOSITE_INSETS_PERCENT,
  MIN_NAME_AREA_PERCENT,
  type PosterDecoration,
  type PosterInsets,
  type PosterNameArea,
  type PosterVerticalTextArea,
} from '@/lib/poster-decorations';

/** Size of the grab zone around an edge or corner, in screen pixels. */
const GRAB = 14;
/** Shown in the name area while the ADMIN edits; families see their own name. */
const SAMPLE_NAME = 'Dòng họ Nguyễn';
const SAMPLE_LEFT_TEXT = 'Tổ tiên công đức thiên niên thịnh';
const SAMPLE_RIGHT_TEXT = 'Tử hiếu tôn hiền vạn đại vinh';

export const NO_TREE_AREA: PosterInsets = { top: 0, right: 0, bottom: 0, left: 0 };

export function hasTreeArea(insets: PosterInsets): boolean {
  return insets.top + insets.right + insets.bottom + insets.left > 0;
}

const AREA_KEYS = ['tree', 'name', 'leftText', 'rightText'] as const;
type AreaKey = (typeof AREA_KEYS)[number];

const AREA_NAMES: Record<AreaKey, string> = {
  tree: 'Vùng đặt cây',
  name: 'Vùng tên dòng họ',
  leftText: 'Vùng chữ dọc trái',
  rightText: 'Vùng chữ dọc phải',
};

/** The smallest width and height each area may have, in percent of the sheet (the API's limits). */
const MIN_SIZE: Record<AreaKey, number> = {
  tree: 100 - MAX_OPPOSITE_INSETS_PERCENT,
  name: MIN_NAME_AREA_PERCENT,
  leftText: MIN_NAME_AREA_PERCENT,
  rightText: MIN_NAME_AREA_PERCENT,
};

const AREA_STYLE: Record<AreaKey, { label: string; dot: string; outline: string; handle: string }> =
  {
    tree: {
      label: 'Cây gia phả',
      dot: 'bg-brand-500',
      outline: 'border-brand-700 bg-brand-600/10 text-brand-900',
      handle: 'border-brand-700 group-hover:bg-brand-100',
    },
    name: {
      label: '',
      dot: 'bg-sky-500',
      outline: 'border-sky-700 bg-sky-500/10',
      handle: 'border-sky-700 group-hover:bg-sky-100',
    },
    leftText: {
      label: '',
      dot: 'bg-amber-500',
      outline: 'border-amber-700 bg-amber-500/10',
      handle: 'border-amber-700 group-hover:bg-amber-100',
    },
    rightText: {
      label: '',
      dot: 'bg-violet-500',
      outline: 'border-violet-700 bg-violet-500/10',
      handle: 'border-violet-700 group-hover:bg-violet-100',
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

/** Area edges are kept to a tenth of a percent, as the API stores them. */
function toTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function insetsBetween(start: Point, end: Point): PosterInsets {
  return {
    top: toTenth(Math.min(start.y, end.y)),
    right: toTenth(100 - Math.max(start.x, end.x)),
    bottom: toTenth(100 - Math.max(start.y, end.y)),
    left: toTenth(Math.min(start.x, end.x)),
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
  const pull = (value: number, opposite: number): number =>
    toTenth(clamp(value, 0, 100 - opposite - minSize));
  if (edges.includes('top')) next.top = pull(point.y, before.bottom);
  if (edges.includes('bottom')) next.bottom = pull(100 - point.y, before.top);
  if (edges.includes('left')) next.left = pull(point.x, before.right);
  if (edges.includes('right')) next.right = pull(100 - point.x, before.left);
  return next;
}

/** Shifts the whole area by the pointer's travel, keeping it on the sheet. */
function moved(before: PosterInsets, start: Point, point: Point): PosterInsets {
  const spareX = before.left + before.right;
  const spareY = before.top + before.bottom;
  const left = toTenth(clamp(before.left + point.x - start.x, 0, spareX));
  const top = toTenth(clamp(before.top + point.y - start.y, 0, spareY));
  return { top, right: toTenth(spareX - left), bottom: toTenth(spareY - top), left };
}

/** How far each arrow key nudges an area, in percent of the sheet. */
const ARROW_STEPS: Record<string, Point | undefined> = {
  ArrowUp: { x: 0, y: -0.1 },
  ArrowDown: { x: 0, y: 0.1 },
  ArrowLeft: { x: -0.1, y: 0 },
  ArrowRight: { x: 0.1, y: 0 },
};

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
 * the tree is placed in plus the family name and two vertical text areas:
 * drag on the art to draw the chosen area, drag its edges or corners to resize
 * it, and drag inside it to move it. The sheet is stretched to any tree's
 * size, so areas are kept in percent and line up with the art at every size.
 */
export function PosterAreaEditor({
  background,
  treeArea,
  nameArea,
  leftTextArea,
  rightTextArea,
  onTreeAreaChange,
  onNameAreaChange,
  onLeftTextAreaChange,
  onRightTextAreaChange,
}: {
  background: PosterDecoration;
  treeArea: PosterInsets;
  nameArea: PosterNameArea | null;
  leftTextArea: PosterVerticalTextArea | null;
  rightTextArea: PosterVerticalTextArea | null;
  onTreeAreaChange: (insets: PosterInsets) => void;
  onNameAreaChange: (area: PosterNameArea | null) => void;
  onLeftTextAreaChange: (area: PosterVerticalTextArea | null) => void;
  onRightTextAreaChange: (area: PosterVerticalTextArea | null) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<AreaKey>('tree');
  const [drag, setDrag] = useState<(Drag & { area: AreaKey }) | null>(null);

  const areas: Record<AreaKey, PosterInsets | null> = {
    tree: hasTreeArea(treeArea) ? treeArea : null,
    name: nameArea ? insetsOf(nameArea) : null,
    leftText: leftTextArea ? insetsOf(leftTextArea) : null,
    rightText: rightTextArea ? insetsOf(rightTextArea) : null,
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
    } else if (key === 'name') {
      onNameAreaChange(
        insets
          ? {
              ...insets,
              curve: nameArea?.curve ?? 0,
              color: nameArea?.color ?? DEFAULT_NAME_COLOR,
            }
          : null,
      );
    } else {
      const current = key === 'leftText' ? leftTextArea : rightTextArea;
      const next = insets ? { ...insets, color: current?.color ?? DEFAULT_NAME_COLOR } : null;
      if (key === 'leftText') onLeftTextAreaChange(next);
      else onRightTextAreaChange(next);
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
    // Focus the sheet so the arrow keys nudge the area just picked.
    boxRef.current?.focus({ preventScroll: true });
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

  /** Arrow keys move the chosen area one step; with Shift they pull its right or bottom edge. */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const step = ARROW_STEPS[event.key];
    const before = areas[active];
    if (!step || !before || drag) return;
    event.preventDefault();
    if (event.shiftKey) {
      const edges: Edge[] = step.x !== 0 ? ['right'] : ['bottom'];
      const corner = { x: 100 - before.right + step.x, y: 100 - before.bottom + step.y };
      setArea(active, resized(before, edges, corner, MIN_SIZE[active]));
    } else {
      setArea(active, moved(before, { x: 0, y: 0 }, step));
    }
  }

  const height = (width * 9) / 16;
  const activeArea = areas[active];
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-stone-50/80 p-2">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Vùng đang chỉnh">
          {AREA_KEYS.map((key) => [key, AREA_NAMES[key]] as const).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              role="radio"
              aria-checked={active === key}
              variant={active === key ? 'default' : 'ghost'}
              onClick={() => setActive(key)}
            >
              <span className={'size-2.5 rounded-full ' + AREA_STYLE[key].dot} aria-hidden="true" />
              {label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-red-700 hover:bg-red-50 hover:text-red-800"
          onClick={() => setArea(active, null)}
          disabled={!activeArea}
        >
          <Eraser className="size-3.5" aria-hidden="true" />
          Bỏ vùng này
        </Button>
      </div>

      {activeArea ? null : (
        <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
          Chưa có {AREA_NAMES[active].toLowerCase()}. Kéo chuột trên ảnh để vẽ khung.
        </p>
      )}

      {active === 'name' && nameArea ? (
        <div className="grid gap-4 rounded-xl border bg-white p-4 sm:grid-cols-[1fr_auto]">
          <label className="grid gap-1.5 text-sm text-brand-950" htmlFor="name-area-curve">
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
          <label className="flex items-center gap-2 self-start text-sm text-brand-950">
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

      {active === 'leftText' && leftTextArea ? (
        <TextColorControl
          id="left-text-area-color"
          value={leftTextArea.color}
          onChange={(color) => onLeftTextAreaChange({ ...leftTextArea, color })}
        />
      ) : null}

      {active === 'rightText' && rightTextArea ? (
        <TextColorControl
          id="right-text-area-color"
          value={rightTextArea.color}
          onChange={(color) => onRightTextAreaChange({ ...rightTextArea, color })}
        />
      ) : null}

      <div
        ref={boxRef}
        tabIndex={0}
        className="relative aspect-video w-full cursor-crosshair touch-none select-none overflow-hidden rounded-xl border border-gold-500/35 bg-paper-deep outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
        onPointerDown={(event) => startDrag(event, active, { kind: 'draw' })}
        onKeyDown={handleKeyDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          if (drag) setArea(drag.area, drag.before);
          setDrag(null);
        }}
        role="application"
        aria-label="Kéo chuột trên ảnh để vẽ, kéo cạnh hoặc góc để chỉnh vùng đặt cây, vùng tên dòng họ và hai vùng chữ dọc. Phím mũi tên di chuyển vùng đang chọn, Shift cùng phím mũi tên đổi kích thước."
      >
        {width > 0 ? (
          <PosterBackgroundSwatch decoration={background} width={width} height={height} />
        ) : null}
        {nameArea && width > 0 ? (
          <PosterFamilyName area={nameArea} name={SAMPLE_NAME} width={width} height={height} />
        ) : null}
        {leftTextArea && width > 0 ? (
          <PosterVerticalText
            area={leftTextArea}
            text={SAMPLE_LEFT_TEXT}
            width={width}
            height={height}
          />
        ) : null}
        {rightTextArea && width > 0 ? (
          <PosterVerticalText
            area={rightTextArea}
            text={SAMPLE_RIGHT_TEXT}
            width={width}
            height={height}
          />
        ) : null}

        {/* The chosen area goes last so its handles sit above any area it overlaps. */}
        {AREA_KEYS.filter((key) => key !== active)
          .concat(active)
          .map((key) => {
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

      <ul className="grid gap-x-6 gap-y-2 text-xs leading-5 text-stone-600 sm:grid-cols-2">
        <li>
          <strong className="font-medium text-brand-950">Vẽ khung:</strong> kéo chuột trên ảnh.
        </li>
        <li>
          <strong className="font-medium text-brand-950">Đổi kích thước:</strong> kéo cạnh hoặc góc
          khung.
        </li>
        <li>
          <strong className="font-medium text-brand-950">Di chuyển:</strong> kéo phần giữa khung,
          hoặc bấm vào khung rồi dùng <Kbd>←</Kbd> <Kbd>↑</Kbd> <Kbd>→</Kbd> <Kbd>↓</Kbd>.
        </li>
        <li>
          <strong className="font-medium text-brand-950">Nới / thu:</strong> giữ <Kbd>Shift</Kbd>{' '}
          cùng phím mũi tên.
        </li>
      </ul>
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-grid min-w-5 place-items-center rounded border border-b-2 bg-white px-1 font-sans text-[11px] text-stone-700">
      {children}
    </kbd>
  );
}

function TextColorControl({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border bg-white p-3 text-sm font-medium text-brand-950 sm:justify-self-start sm:pr-5">
      <input
        id={id}
        type="color"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="h-9 w-12 rounded border bg-white"
      />
      Màu chữ
    </label>
  );
}
