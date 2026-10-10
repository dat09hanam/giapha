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
import type { PricingPlan, ServiceRegistration } from '@/types/pricing';

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

export const getPlatformFeatures = cache(() =>
  getJson<FamilyFeatures>('/platform-features', 'tải danh sách chức năng'),
);

export type DemoFamily = { id: string; slug: string; name: string };

export const getDemoFamily = cache(() => getJson<DemoFamily>('/demo-family', 'tải gia phả mẫu'));

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

export const getTreeEditScope = cache((slug: string, sessionToken: string) =>
  getJson<TreeEditScope>(
    `/families/${encodeURIComponent(slug)}/tree/scope`,
    'tải quyền chỉnh sửa',
    sessionToken,
  ),
);

export const getFamilyAccounts = cache((slug: string, sessionToken: string) =>
  getJson<FamilyAccount[]>(
    `/families/${encodeURIComponent(slug)}/accounts`,
    'tải danh sách tài khoản',
    sessionToken,
  ),
);

export const getFamilyUsernameSuffix = cache((slug: string, sessionToken: string) =>
  getJson<{ suffix: string }>(
    `/families/${encodeURIComponent(slug)}/accounts/username-suffix`,
    'tải hậu tố tên đăng nhập',
    sessionToken,
  ),
);

export const getAuthProfile = cache((sessionToken: string) =>
  getJson<AuthProfile>('/auth/me', 'tải thông tin tài khoản', sessionToken),
);

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

export const getFundLedger = cache((slug: string, sessionToken: string) =>
  getJson<FundLedger>(`/families/${encodeURIComponent(slug)}/fund`, 'tải quỹ họ', sessionToken),
);

export const getFeedFirstPage = cache((slug: string, sessionToken: string) =>
  getJson<FeedPage>(`/families/${encodeURIComponent(slug)}/feed`, 'tải bảng tin', sessionToken),
);

export const getMeritOverview = cache((slug: string, sessionToken: string) =>
  getJson<MeritOverview>(
    `/families/${encodeURIComponent(slug)}/merit`,
    'tải danh sách công đức',
    sessionToken,
  ),
);

export const getMeritEvent = cache((slug: string, eventId: string, sessionToken: string) =>
  getJson<MeritEventDetail>(
    `/families/${encodeURIComponent(slug)}/merit/events/${encodeURIComponent(eventId)}`,
    'tải sự kiện công đức',
    sessionToken,
  ),
);

export const getEditSuggestions = cache((slug: string, sessionToken: string) =>
  getJson<EditSuggestion[]>(
    `/families/${encodeURIComponent(slug)}/suggestions`,
    'tải đề xuất chỉnh sửa',
    sessionToken,
  ),
);

export const getPosterDecorations = cache(
  <T extends PosterDecoration = PosterDecoration>(sessionToken: string) =>
    getJson<T[]>('/poster-decorations', 'tải thư viện hình nền', sessionToken),
);

export const getArticles = cache((category: ArticleCategory) =>
  getJson<ArticleSummary[]>(`/articles?category=${category}`, 'tải danh sách bài viết'),
);

export const getArticle = cache((category: ArticleCategory, slug: string) =>
  getJson<Article>(`/articles/${category}/${encodeURIComponent(slug)}`, 'tải bài viết'),
);

export const getAdminArticles = cache((sessionToken: string) =>
  getJson<AdminArticle[]>('/articles/admin', 'tải danh sách bài viết', sessionToken),
);

export const getPricingPlans = cache(() =>
  getJson<PricingPlan[]>('/pricing-plans', 'tải bảng giá dịch vụ'),
);

export const getAdminPricingPlans = cache((sessionToken: string) =>
  getJson<PricingPlan[]>('/pricing-plans/admin', 'tải danh sách gói dịch vụ', sessionToken),
);

export const getServiceRegistrations = cache((sessionToken: string) =>
  getJson<ServiceRegistration[]>('/service-registrations', 'tải danh sách đăng ký', sessionToken),
);
