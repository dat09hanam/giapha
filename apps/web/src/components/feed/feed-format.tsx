import { cn } from '@/lib/utils';
import type { FeedReactionType } from '@/lib/feed-api';

export const REACTIONS: readonly {
  type: FeedReactionType;
  emoji: string;
  label: string;
  /** Colour of the "Thích" button once chosen. */
  textClass: string;
}[] = [
  { type: 'LIKE', emoji: '👍', label: 'Thích', textClass: 'text-blue-600' },
  { type: 'LOVE', emoji: '❤️', label: 'Yêu thích', textClass: 'text-red-600' },
  { type: 'CARE', emoji: '🥰', label: 'Thương thương', textClass: 'text-amber-600' },
  { type: 'HAHA', emoji: '😆', label: 'Haha', textClass: 'text-amber-600' },
  { type: 'WOW', emoji: '😮', label: 'Wow', textClass: 'text-amber-600' },
  { type: 'SAD', emoji: '😢', label: 'Buồn', textClass: 'text-amber-600' },
  { type: 'ANGRY', emoji: '😡', label: 'Phẫn nộ', textClass: 'text-orange-600' },
];

export const REACTION_BY_TYPE = Object.fromEntries(
  REACTIONS.map((reaction) => [reaction.type, reaction]),
) as Record<FeedReactionType, (typeof REACTIONS)[number]>;

/** "Vừa xong", "5 phút", "3 giờ", "2 ngày", then a date, like Facebook. */
export function timeAgo(iso: string, now = Date.now()): string {
  const date = new Date(iso);
  const seconds = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (seconds < 60) return 'Vừa xong';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} giờ`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)} ngày`;
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

const AVATAR_COLORS = [
  'bg-brand-600',
  'bg-amber-600',
  'bg-sky-600',
  'bg-rose-600',
  'bg-violet-600',
  'bg-teal-600',
  'bg-orange-600',
  'bg-indigo-600',
];

/**
 * A round badge with the first letter of the given name: Vietnamese names put
 * it last, so "Nguyễn Văn Bình" shows "B". The colour follows the name.
 */
export function NameAvatar({ name, className }: { name: string; className?: string }) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initial = (words.at(-1)?.[0] ?? '?').toLocaleUpperCase('vi');
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (
    <span
      className={cn(
        'grid size-10 shrink-0 select-none place-items-center rounded-full font-semibold text-white',
        AVATAR_COLORS[hash % AVATAR_COLORS.length],
        className,
      )}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
