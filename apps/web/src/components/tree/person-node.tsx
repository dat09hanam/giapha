import { Handle, Position, type NodeProps } from '@xyflow/react';
import { UserRound } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PersonFlowNode } from '@/lib/tree-layout';

const genderStyles = {
  MALE: 'bg-sky-100 text-sky-800 ring-sky-200',
  FEMALE: 'bg-rose-100 text-rose-800 ring-rose-200',
  OTHER: 'bg-violet-100 text-violet-800 ring-violet-200',
  UNKNOWN: 'bg-stone-100 text-stone-700 ring-stone-200',
} as const;

export function PersonNode({ data }: NodeProps<PersonFlowNode>) {
  return (
    <article className="w-[220px] rounded-2xl border border-emerald-950/15 bg-[#fffdf8] p-4 shadow-lg shadow-emerald-950/8">
      <Handle type="target" position={Position.Top} className="!size-2 !border-0 !bg-emerald-800" />
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-full ring-1',
            genderStyles[data.gender],
          )}
        >
          <UserRound className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-emerald-950" title={data.displayName}>
            {data.displayName}
          </h2>
          <p className="mt-1 text-xs text-stone-500">{data.lifespan}</p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-emerald-700">
            Đời thứ {data.generation}
          </p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-2 !border-0 !bg-emerald-800"
      />
    </article>
  );
}
