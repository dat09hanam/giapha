import { apiFetch } from '@/lib/api-error';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

/** Admin lists whose new rows count toward an unread badge in the sidebar. */
export type AdminSeenList = 'service-registrations' | 'ambassadors';

/** Records that an admin opened the list, so its rows no longer count as unread. */
export function markAdminListSeen(list: AdminSeenList): Promise<void> {
  return apiFetch<void>(
    `${API_URL}/${list}/seen`,
    { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' } },
    'đánh dấu đã xem',
  );
}
