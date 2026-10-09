import { cn } from '@/lib/utils';

/**
 * The app's loading mark: a family tree that grows from the founding
 * ancestor down two generations, then fades and grows again. Animated by the
 * `heritage-*` keyframes in globals.css.
 */
export function TreeLoader({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 96"
      className={cn('heritage-tree h-24 w-28 text-brand-700', className)}
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gold-500"
      >
        <path pathLength={1} className="heritage-line-1" d="M60 20V34H30V48M60 34H90V48" />
        <path
          pathLength={1}
          className="heritage-line-2"
          d="M30 59V68H16V77M30 68H44V77M90 59V68H76V77M90 68H104V77"
        />
      </g>
      <circle className="heritage-node-1" cx="60" cy="13" r="7" fill="currentColor" />
      <g fill="currentColor" className="heritage-node-2">
        <circle cx="30" cy="54" r="5.5" />
        <circle cx="90" cy="54" r="5.5" />
      </g>
      <g fill="currentColor" className="heritage-node-3 text-wood-600">
        <circle cx="16" cy="82" r="4.5" />
        <circle cx="44" cy="82" r="4.5" />
        <circle cx="76" cy="82" r="4.5" />
        <circle cx="104" cy="82" r="4.5" />
      </g>
    </svg>
  );
}

/** A whole page or panel while it loads: the growing tree and what is coming. */
export function PageLoader({
  label = 'Đang tải gia phả',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('grid min-h-[60vh] w-full place-items-center px-4 py-12', className)}
    >
      <div className="grid justify-items-center gap-4">
        <TreeLoader />
        <p className="heritage-caption font-display text-base font-semibold text-wood-700">
          {label}
          <span aria-hidden="true">…</span>
        </p>
      </div>
    </div>
  );
}

/**
 * The small mark for a busy button or row, in place of a spinning icon: a
 * parent and two children lighting up in turn. Takes the text colour.
 */
export function InlineLoader({ className, label }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn('size-4 shrink-0', className)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <path
        d="M8 5v3M8 8H3.5v2.5M8 8h4.5v2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.35"
      />
      <circle className="heritage-dot heritage-dot-1" cx="8" cy="3" r="2.2" fill="currentColor" />
      <circle
        className="heritage-dot heritage-dot-2"
        cx="3.5"
        cy="12.5"
        r="2.2"
        fill="currentColor"
      />
      <circle
        className="heritage-dot heritage-dot-3"
        cx="12.5"
        cy="12.5"
        r="2.2"
        fill="currentColor"
      />
    </svg>
  );
}
