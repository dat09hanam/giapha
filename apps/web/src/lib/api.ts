import { cache } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api-error';
import type { AuthProfile } from '@/lib/auth-api';
import type { TreeEditScope } from '@/lib/branch-scope';
import type { FamilyAccount } from '@/lib/family-accounts-api';
import type { PosterDecoration } from '@/lib/poster-decorations';
import type { FeedPage } from '@/lib/feed-api';
import type { FundLedger } from '@/lib/fund-api';
import type { AlbumDetail, LibraryOverview } from '@/lib/library-api';
import type { MeritEventDetail, MeritOverview } from '@/lib/merit-api';
import type { AdminArticle, Article, ArticleCategory, ArticleSummary } from '@/types/article';
import type { EditSuggestion } from '@/types/edit-suggestion';
import type { FamilyDetails, FamilyFeatures, FamilyTreeResponse } from '@/types/family-tree';

const API_URL = (process.env.API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export class ApiNotFoundError extends ApiRequestError {
  constructor(message: string) {
    super(message, 404, 'http');
    this.name = 'ApiNotFoundError';
  }
}

export class ApiUnauthorizedError extends ApiRequestError {
  constructor(message: string) {
    super(message, 401, 'http');
    this.name = 'ApiUnauthorizedError';
  }
}

async function getJson<T>(path: string, action: string, sessionToken?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (sessionToken) {
    headers.Cookie = `giapha_session=${encodeURIComponent(sessionToken)}`;
  }

  try {
    return await apiFetch<T>(
      `${API_URL}${path}`,
      {
        headers,
        cache: 'no-store',
      },
      action,
    );
  } catch (error: unknown) {
    if (error instanceof ApiRequestError && error.status === 404) {
      throw new ApiNotFoundError(error.message);
    }

    if (error instanceof ApiRequestError && error.status === 401) {
      throw new ApiUnauthorizedError(error.message);
    }

    throw error;
  }
}

export const getFamily = cache((slug: string) =>
  getJson<FamilyDetails>(`/families/${encodeURIComponent(slug)}`, 'tải thông tin dòng họ'),
);

/** Which family sections the platform admin has switched on, for every family. */
export const getPlatformFeatures = cache(() =>
  getJson<FamilyFeatures>('/platform-features', 'tải danh sách chức năng'),
);

export type DemoFamily = { id: string; slug: string; name: string };

/** The public sample family (Gia phả mẫu); 404 until the platform admin marks one. */
export const getDemoFamily = cache(() => getJson<DemoFamily>('/demo-family', 'tải gia phả mẫu'));

/** The sample family's tree, readable without signing in; phones and photos are left out. */
export const getDemoFamilyTree = cache(() =>
  getJson<FamilyTreeResponse>('/demo-family/tree', 'tải cây gia phả mẫu'),
);

export const getFamilyTree = cache((slug: string, sessionToken?: string) =>
  getJson<FamilyTreeResponse>(
    `/families/${encodeURIComponent(slug)}/tree`,
    'tải cây gia phả',
    sessionToken,
  ),
);

/** Everything for the clan head; a branch manager gets the roots of their chi/nhánh. */
export const getTreeEditScope = cache((slug: string, sessionToken: string) =>
  getJson<TreeEditScope>(
    `/families/${encodeURIComponent(slug)}/tree/scope`,
    'tải quyền chỉnh sửa',
    sessionToken,
  ),
);

/** Member accounts and the chi/nhánh each manages; clan head (MEMBER_PLUS) only. */
export const getFamilyAccounts = cache((slug: string, sessionToken: string) =>
  getJson<FamilyAccount[]>(
    `/families/${encodeURIComponent(slug)}/accounts`,
    'tải danh sách tài khoản',
    sessionToken,
  ),
);

export const getAuthProfile = cache((sessionToken: string) =>
  getJson<AuthProfile>('/auth/me', 'tải thông tin tài khoản', sessionToken),
);

/** Album và tư liệu: albums with covers, and documents; every member may read them. */
export const getLibrary = cache((slug: string, sessionToken: string) =>
  getJson<LibraryOverview>(
    `/families/${encodeURIComponent(slug)}/library`,
    'tải album và tư liệu',
    sessionToken,
  ),
);

export const getAlbum = cache((slug: string, albumId: string, sessionToken: string) =>
  getJson<AlbumDetail>(
    `/families/${encodeURIComponent(slug)}/library/albums/${encodeURIComponent(albumId)}`,
    'tải album',
    sessionToken,
  ),
);

/** Quỹ họ: the ledger with totals; every member may read it. */
export const getFundLedger = cache((slug: string, sessionToken: string) =>
  getJson<FundLedger>(`/families/${encodeURIComponent(slug)}/fund`, 'tải quỹ họ', sessionToken),
);

/** The first page of Bảng tin, newest first; read-only, so no device key is sent. */
export const getFeedFirstPage = cache((slug: string, sessionToken: string) =>
  getJson<FeedPage>(`/families/${encodeURIComponent(slug)}/feed`, 'tải bảng tin', sessionToken),
);

/** Công đức: the events with their totals; every member may read them. */
export const getMeritOverview = cache((slug: string, sessionToken: string) =>
  getJson<MeritOverview>(
    `/families/${encodeURIComponent(slug)}/merit`,
    'tải danh sách công đức',
    sessionToken,
  ),
);

/** One Công đức event with its donors. */
export const getMeritEvent = cache((slug: string, eventId: string, sessionToken: string) =>
  getJson<MeritEventDetail>(
    `/families/${encodeURIComponent(slug)}/merit/events/${encodeURIComponent(eventId)}`,
    'tải sự kiện công đức',
    sessionToken,
  ),
);

/** The family's edit suggestions, newest first; clan head (MEMBER_PLUS) only. */
export const getEditSuggestions = cache((slug: string, sessionToken: string) =>
  getJson<EditSuggestion[]>(
    `/families/${encodeURIComponent(slug)}/suggestions`,
    'tải đề xuất chỉnh sửa',
    sessionToken,
  ),
);

/** Active decorations for family heads; the platform ADMIN also gets hidden ones and usage. */
export const getPosterDecorations = cache(
  <T extends PosterDecoration = PosterDecoration>(sessionToken: string) =>
    getJson<T[]>('/poster-decorations', 'tải thư viện hình nền', sessionToken),
);

/** The published articles of Mẫu bài cúng or Thư viện, newest first; readable by anyone. */
export const getArticles = cache((category: ArticleCategory) =>
  getJson<ArticleSummary[]>(`/articles?category=${category}`, 'tải danh sách bài viết'),
);

/** One published article; 404 for a draft or an unknown path. */
export const getArticle = cache((category: ArticleCategory, slug: string) =>
  getJson<Article>(`/articles/${category}/${encodeURIComponent(slug)}`, 'tải bài viết'),
);

/** Every article, drafts included; platform ADMIN only. */
export const getAdminArticles = cache((sessionToken: string) =>
  getJson<AdminArticle[]>('/articles/admin', 'tải danh sách bài viết', sessionToken),
);
