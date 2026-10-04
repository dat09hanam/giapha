'use client';

import { LoaderCircle, Newspaper, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { PostCard } from '@/components/feed/post-card';
import { PostComposer } from '@/components/feed/post-composer';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';
import { getFeedPage, type FeedPost } from '@/lib/feed-api';

function PostSkeleton() {
  return (
    <div className="animate-pulse bg-white px-4 py-4 shadow-sm sm:rounded-2xl sm:border sm:border-stone-200">
      <div className="flex items-center gap-2.5">
        <div className="size-10 rounded-full bg-stone-200" />
        <div className="grid gap-1.5">
          <div className="h-3.5 w-32 rounded bg-stone-200" />
          <div className="h-3 w-16 rounded bg-stone-100" />
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        <div className="h-3.5 w-full rounded bg-stone-100" />
        <div className="h-3.5 w-4/5 rounded bg-stone-100" />
      </div>
      <div className="mt-4 h-48 rounded-xl bg-stone-100" />
    </div>
  );
}

/**
 * The family's news feed: everyone posts, comments, replies and reacts.
 * Loaded in the browser, since what is "mine" depends on this device's key.
 */
export function FamilyFeed({ familySlug }: { familySlug: string }) {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [canModerate, setCanModerate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadFirstPage = useCallback(async () => {
    setError(null);
    try {
      const page = await getFeedPage(familySlug);
      setPosts(page.posts);
      setNextCursor(page.nextCursor);
      setCanModerate(page.canModerate);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'tải bảng tin'));
    }
  }, [familySlug]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getFeedPage(familySlug, nextCursor);
      setPosts((current) => {
        const known = new Set(current?.map((post) => post.id));
        return [...(current ?? []), ...page.posts.filter((post) => !known.has(post.id))];
      });
      setNextCursor(page.nextCursor);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'tải thêm bài viết'));
    } finally {
      setLoadingMore(false);
    }
  }, [familySlug, loadingMore, nextCursor]);

  // The next page loads as the reader nears the end of the list.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadMore();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  async function refresh(): Promise<void> {
    setRefreshing(true);
    await loadFirstPage();
    setRefreshing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const updatePost = useCallback((updated: FeedPost) => {
    setPosts(
      (current) => current?.map((post) => (post.id === updated.id ? updated : post)) ?? null,
    );
  }, []);
  const removePost = useCallback((postId: string) => {
    setPosts((current) => current?.filter((post) => post.id !== postId) ?? null);
  }, []);

  return (
    <div className="mx-auto grid w-full max-w-xl gap-2 pb-6 sm:gap-4 sm:px-4 sm:py-6">
      <div className="flex items-center justify-between bg-white px-4 py-2.5 shadow-sm sm:rounded-2xl sm:border sm:border-stone-200">
        <h1 className="flex items-center gap-2 text-xl font-bold text-emerald-950">
          <Newspaper className="size-5 text-emerald-700" aria-hidden="true" />
          Bảng tin
        </h1>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing || posts === null}
          className="grid size-9 place-items-center rounded-full text-stone-600 hover:bg-stone-100 disabled:opacity-50"
          aria-label="Làm mới bảng tin"
        >
          <RefreshCw className={refreshing ? 'size-5 animate-spin' : 'size-5'} aria-hidden="true" />
        </button>
      </div>

      <PostComposer
        familySlug={familySlug}
        onCreated={(post) => setPosts((current) => [post, ...(current ?? [])])}
      />

      {error && posts === null ? (
        <div className="grid justify-items-center gap-3 bg-white px-4 py-10 text-center shadow-sm sm:rounded-2xl">
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
          <Button type="button" variant="outline" onClick={() => void loadFirstPage()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Thử lại
          </Button>
        </div>
      ) : posts === null ? (
        <>
          <PostSkeleton />
          <PostSkeleton />
        </>
      ) : posts.length === 0 ? (
        <div className="grid justify-items-center gap-2 bg-white px-6 py-12 text-center shadow-sm sm:rounded-2xl">
          <span className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <Newspaper className="size-7" aria-hidden="true" />
          </span>
          <p className="font-semibold text-stone-800">Chưa có bài viết nào</p>
          <p className="text-sm text-stone-500">
            Hãy là người đầu tiên chia sẻ tin vui, ảnh họp họ hay lời nhắn tới cả nhà.
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            familySlug={familySlug}
            canModerate={canModerate}
            onChange={updatePost}
            onDelete={removePost}
          />
        ))
      )}

      {posts && posts.length > 0 ? (
        <div ref={sentinelRef} className="grid place-items-center py-4 text-sm text-stone-500">
          {loadingMore ? (
            <LoaderCircle className="size-6 animate-spin" aria-label="Đang tải thêm" />
          ) : nextCursor ? (
            <Button type="button" variant="ghost" onClick={() => void loadMore()}>
              Xem thêm bài viết
            </Button>
          ) : (
            <span>Bạn đã xem hết bài viết.</span>
          )}
          {error && posts !== null ? (
            <span className="mt-2 text-red-700" role="alert">
              {error}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
