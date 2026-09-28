import type { CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

import { PersonAvatar } from '@/components/ui/person-avatar';
import { cn } from '@/lib/utils';
import type { PersonFlowNode } from '@/lib/tree-layout';

/**
 * Nine-slice frames: the corners keep their carved shape while the card stays a
 * fixed 16:9 at every screen size. Slice values are in source-image pixels.
 */
const FRAME_STYLES = {
  founder: {
    borderStyle: 'solid',
    borderWidth: 30,
    borderImage: 'url(/images/frames/frame-doi-1.png) 80 fill / 30px stretch',
  },
  descendant: {
    borderStyle: 'solid',
    borderWidth: 33,
    borderImage: 'url(/images/frames/frame-doi-2.png) 90 fill / 33px stretch',
  },
} satisfies Record<string, CSSProperties>;

const genderRings = {
  MALE: 'ring-sky-200 bg-sky-50',
  FEMALE: 'ring-rose-200 bg-rose-50',
  OTHER: 'ring-violet-200 bg-violet-50',
  UNKNOWN: 'ring-stone-200 bg-stone-50',
} as const;

const hiddenHandle = '!size-1 !min-h-0 !min-w-0 !border-0 !bg-transparent';

export function PersonNode({ data }: NodeProps<PersonFlowNode>) {
  const isFounder = data.generation === 1;

  return (
    <div className="relative aspect-video w-[288px]">
      {isFounder ? (
        // The Đời 1 crest sits on the top edge of the frame.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/images/frames/crest-doi-1.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute bottom-[calc(100%-1px)] left-1/2 w-[82%] -translate-x-1/2 select-none"
        />
      ) : null}

      <article
        className="absolute inset-0 flex items-center gap-3 px-1 drop-shadow-[0_6px_10px_rgba(80,55,10,0.18)]"
        style={isFounder ? FRAME_STYLES.founder : FRAME_STYLES.descendant}
      >
        <span
          className={cn(
            'grid size-14 shrink-0 place-items-center overflow-hidden rounded-full ring-2',
            genderRings[data.gender],
          )}
        >
          {data.avatarSrc ? (
            // Avatars are served by the API, outside next/image's loader.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.avatarSrc} alt="" className="size-full object-cover" draggable={false} />
          ) : (
            <PersonAvatar
              gender={data.gender}
              generation={data.generation}
              birthDate={data.birthDate}
              className="size-full"
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          {data.honorific ? (
            <p
              className="truncate text-[10px] font-semibold uppercase tracking-wider text-amber-800"
              title={data.honorific}
            >
              {data.honorific}
            </p>
          ) : null}
          <h2
            className="line-clamp-2 text-[15px] font-semibold leading-tight text-[#3b2a0c]"
            title={data.name}
          >
            {data.name}
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-stone-600">{data.lifespan}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
            Đời thứ {data.generation}
          </p>
        </div>
      </article>

      <Handle id="parent-target" type="target" position={Position.Top} className={hiddenHandle} />
      <Handle id="spouse-target" type="target" position={Position.Left} className={hiddenHandle} />
      <Handle id="spouse-source" type="source" position={Position.Right} className={hiddenHandle} />
      <Handle id="child-source" type="source" position={Position.Bottom} className={hiddenHandle} />
      <Handle id="bracket-target" type="target" position={Position.Bottom} className={hiddenHandle} />
    </div>
  );
}
