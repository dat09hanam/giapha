/** Marks a row that arrived since an admin last opened its list. */
export function UnreadTag({ seenAt }: { seenAt: string | null }) {
  if (seenAt) return null;
  return (
    <span className="shrink-0 rounded-full bg-red-600 px-2 text-[11px] font-semibold uppercase leading-5 tracking-wide text-white">
      Mới
    </span>
  );
}
