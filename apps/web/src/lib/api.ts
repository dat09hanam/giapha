import { cache } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api-error';
import type { AuthProfile } from '@/lib/auth-api';
import type { FamilyDetails, FamilyTreeResponse } from '@/types/family-tree';

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

export const getFamilyTree = cache((slug: string, sessionToken?: string) =>
  getJson<FamilyTreeResponse>(
    `/families/${encodeURIComponent(slug)}/tree`,
    'tải cây gia phả',
    sessionToken,
  ),
);

export const getAuthProfile = cache((sessionToken: string) =>
  getJson<AuthProfile>('/auth/me', 'tải thông tin tài khoản', sessionToken),
);
